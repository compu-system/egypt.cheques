# Copyright (c) 2021, erpcloud.systems and contributors
# For license information, please see license.txt

"""
General Ledger report override.

Fixes the "Add Columns in Transaction Currency" feature so that each GL row
uses its own ``account_currency`` (sourced directly from the GL Entry / Account
master) rather than a shared filter/presentation currency.

This module is monkey-patched onto the ERPNext GL report at app boot time via
the ``boot_session`` hook in hooks.py.
"""

import frappe


def patch_general_ledger_report(*args, **kwargs):
	"""Monkey-patch the ERPNext General Ledger report's execute function.

	The original execute function may set a single presentation currency for all
	rows when "Add Columns in Transaction Currency" is enabled, which causes every
	row to display the same (wrong) currency symbol.  This wrapper ensures each
	row's ``account_currency`` is populated from the GL Entry's account master so
	the column formatter can render per-row currencies correctly.

	Accepts ``*args, **kwargs`` so Frappe can call this as a ``boot_session``
	hook (which passes the boot data as a positional argument) without raising
	a ``TypeError``.
	"""
	try:
		import erpnext.accounts.report.general_ledger.general_ledger as gl_module
	except ImportError:
		return  # ERPNext not installed – nothing to patch

	if getattr(gl_module, "_ecs_patched", False):
		return  # already patched in this process

	_original_execute = gl_module.execute

	def _patched_execute(filters=None):
		result = _original_execute(filters)

		# execute() may return (columns, data) or a dict – handle both
		if isinstance(result, (list, tuple)) and len(result) >= 2:
			columns, data = result[0], result[1]
			_fix_account_currency_per_row(data)
			return (columns, data) + tuple(result[2:])

		return result

	gl_module.execute = _patched_execute
	gl_module._ecs_patched = True


def _fix_account_currency_per_row(data):
	"""Ensure every data row contains the correct ``account_currency`` value.

	ERPNext's GL report may omit ``account_currency`` or set it to the filter
	presentation currency for all rows.  This function fills in the correct
	per-row currency using two sources:

	1. **Payment Entry rows** – the ``paid_from_account_currency`` /
	   ``paid_to_account_currency`` fields from the linked Payment Entry are
	   used so the "Transaction Currency" columns reflect the actual currency
	   of ``paid_amount`` / ``received_amount`` rather than a global fallback.

	2. **All other rows** – the ``account_currency`` is read from the
	   ``Account`` master (batch-fetched for performance).
	"""
	if not data:
		return

	# Collect all unique account names first, then batch-fetch currencies.
	accounts = {row.get("account") for row in data if isinstance(row, dict) and row.get("account")}
	if not accounts:
		return

	account_rows = frappe.get_all(
		"Account",
		filters={"name": ["in", list(accounts)]},
		fields=["name", "account_currency"],
	)
	account_currency_map = {r.name: r.account_currency for r in account_rows if r.account_currency}

	# Batch-fetch Payment Entry currencies for GL rows that come from Payment Entries.
	# Map: (pe_name, account_name) → account_currency
	pe_account_currency_map = {}
	pe_names = {
		row.get("voucher_no")
		for row in data
		if isinstance(row, dict)
		and row.get("voucher_type") == "Payment Entry"
		and row.get("voucher_no")
	}
	if pe_names:
		pe_rows = frappe.get_all(
			"Payment Entry",
			filters={"name": ["in", list(pe_names)]},
			fields=["name", "paid_from", "paid_to", "paid_from_account_currency", "paid_to_account_currency"],
		)
		for pe in pe_rows:
			if pe.paid_from and pe.paid_from_account_currency:
				pe_account_currency_map[(pe.name, pe.paid_from)] = pe.paid_from_account_currency
			if pe.paid_to and pe.paid_to_account_currency:
				pe_account_currency_map[(pe.name, pe.paid_to)] = pe.paid_to_account_currency

	for row in data:
		if not isinstance(row, dict):
			continue
		account = row.get("account")
		if not account:
			continue

		# For Payment Entry rows, prefer the currency stored on the PE document.
		if row.get("voucher_type") == "Payment Entry" and row.get("voucher_no"):
			pe_currency = pe_account_currency_map.get((row["voucher_no"], account))
			if pe_currency:
				row["account_currency"] = pe_currency
				continue

		# Fall back to Account master currency for all other rows.
		if account_currency_map.get(account):
			row["account_currency"] = account_currency_map[account]
