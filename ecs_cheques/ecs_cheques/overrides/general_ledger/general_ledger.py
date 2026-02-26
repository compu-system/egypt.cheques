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


def patch_general_ledger_report():
	"""Monkey-patch the ERPNext General Ledger report's execute function.

	The original execute function may set a single presentation currency for all
	rows when "Add Columns in Transaction Currency" is enabled, which causes every
	row to display the same (wrong) currency symbol.  This wrapper ensures each
	row's ``account_currency`` is populated from the GL Entry's account master so
	the column formatter can render per-row currencies correctly.
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
	presentation currency for all rows.  This function reads the authoritative
	currency from the ``Account`` master and fills it in per row so that the
	"Transaction Currency" columns display the right currency symbol per entry.
	"""
	if not data:
		return

	# Collect all unique account names first, then batch-fetch currencies.
	accounts = {row.get("account") for row in data if isinstance(row, dict) and row.get("account")}
	if not accounts:
		return

	rows = frappe.get_all(
		"Account",
		filters={"name": ["in", list(accounts)]},
		fields=["name", "account_currency"],
	)
	account_currency_map = {r.name: r.account_currency for r in rows if r.account_currency}

	for row in data:
		if not isinstance(row, dict):
			continue
		account = row.get("account")
		if account and account_currency_map.get(account):
			row["account_currency"] = account_currency_map[account]
