# Copyright (c) 2021, erpcloud.systems and Contributors
# See license.txt
"""
Unit tests for _compute_payment_entry_amounts in multiple_cheque_entry.py.

These tests verify the fix for incorrect source_exchange_rate / paid_amount
assignments when creating a Payment Entry from Multiple Cheque Entry.

The scenario described in the issue
-------------------------------------
  Company currency        : ILS
  paid_from account       : party receivable  (currency = ILS)
  paid_to   account       : cheque wallet      (currency = USD)
  Cheque amount entered   : 1 000 USD  →  row.paid_amount = 1 000
  stored_exchange_rate    : 3.159059          (USD → ILS)

Expected Payment Entry
  paid_amount             : 3 159.059 ILS  (from party ILS account)
  received_amount         : 1 000     USD  (into USD cheque wallet)
  source_exchange_rate    : 1          (ILS → ILS = 1)
  target_exchange_rate    : 3.159059   (USD → ILS)

Wrong behaviour (before fix)
  paid_from_account_currency was USD  →  "Paid Amount (USD) = 3 159.059"
"""

import sys
import types
import unittest

# ---------------------------------------------------------------------------
# Bootstrap a minimal frappe stub so the module can be imported without a
# running Frappe instance.
# ---------------------------------------------------------------------------

def _make_frappe_stub():
	mod = types.ModuleType("frappe")
	mod.db = None                          # not used in pure-computation tests
	mod._ = lambda s, *a: s
	mod.whitelist = lambda fn=None, **kw: (fn if fn else lambda f: f)
	class _VE(Exception):
		pass
	mod.ValidationError = _VE
	mod.throw = lambda msg, exc=None: (_ for _ in ()).throw((exc or _VE)(msg))
	return mod

_frappe = _make_frappe_stub()
sys.modules.setdefault("frappe", _frappe)
sys.modules.setdefault("frappe.model", types.ModuleType("frappe.model"))
_doc_mod = types.ModuleType("frappe.model.document")
_doc_mod.Document = object
sys.modules.setdefault("frappe.model.document", _doc_mod)
sys.modules.setdefault("frappe.desk", types.ModuleType("frappe.desk"))
_ds = types.ModuleType("frappe.desk.search")
_ds.sanitize_searchfield = lambda s: s
sys.modules.setdefault("frappe.desk.search", _ds)

_utils = types.ModuleType("frappe.utils")

def _flt(val, precision=None):
	try:
		v = float(val or 0)
	except (TypeError, ValueError):
		v = 0.0
	return round(v, precision) if precision is not None else v

_utils.flt = _flt
_utils.nowdate = lambda: "2024-01-01"
import unittest.mock as _mock
for _attr in ("getdate", "get_url", "now", "nowtime", "get_time", "today",
              "get_datetime", "add_days", "add_to_date"):
	setattr(_utils, _attr, _mock.MagicMock())
sys.modules["frappe.utils"] = _utils

# Now import the function under test.
from ecs_cheques.ecs_cheques.doctype.multiple_cheque_entry.multiple_cheque_entry import (  # noqa: E402
	_compute_payment_entry_amounts,
)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestComputePaymentEntryAmounts(unittest.TestCase):
	"""Verify _compute_payment_entry_amounts for all standard scenarios."""

	# ------------------------------------------------------------------
	# Scenario from the issue
	# ------------------------------------------------------------------

	def test_receive_cross_currency_ils_from_usd_to(self):
		"""
		Receive: paid_from = ILS (party), paid_to = USD (cheque wallet).
		row_paid_amount = 1 000 USD (entered in paid_to currency).
		stored_exchange_rate = 3.159059 (USD → ILS).

		Expected:
		  paid_amount          = 3 159.059 ILS
		  received_amount      = 1 000 USD
		  source_exchange_rate = 1
		  target_exchange_rate = 3.159059
		  paid_from_account_currency = ILS
		  paid_to_account_currency   = USD
		"""
		result = _compute_payment_entry_amounts(
			row_paid_amount=1000.0,
			paid_from_currency="ILS",
			paid_to_currency="USD",
			company_currency="ILS",
			stored_exchange_rate=3.159059,
			payment_type="Receive",
		)
		self.assertAlmostEqual(result["paid_amount"], 3159.059, places=3,
			msg="paid_amount (ILS) must equal 1000 × 3.159059")
		self.assertAlmostEqual(result["received_amount"], 1000.0, places=3,
			msg="received_amount (USD) must be the original cheque amount")
		self.assertAlmostEqual(result["source_exchange_rate"], 1.0, places=6,
			msg="source_exchange_rate must be 1 when paid_from = company currency")
		self.assertAlmostEqual(result["target_exchange_rate"], 3.159059, places=6,
			msg="target_exchange_rate must equal stored_exchange_rate (USD → ILS)")
		self.assertEqual(result["paid_from_account_currency"], "ILS")
		self.assertEqual(result["paid_to_account_currency"], "USD")

	def test_receive_cross_currency_no_inverted_paid_amount(self):
		"""
		Regression: the bug showed 'Paid Amount (USD) = 3 159.059'.
		This is only possible if paid_from_account_currency is wrongly set to USD.
		Verify it is always ILS when paid_from = ILS.
		"""
		result = _compute_payment_entry_amounts(1000.0, "ILS", "USD", "ILS", 3.159059, "Receive")
		self.assertEqual(result["paid_from_account_currency"], "ILS",
			msg="paid_from_account_currency must NOT be USD (regression guard)")
		# The erroneous behaviour was: paid_amount = 3159.059 displayed as USD.
		# With correct currencies this is now 3159.059 ILS, not USD.
		self.assertGreater(result["paid_amount"], result["received_amount"],
			msg="ILS amount must be larger than the USD amount for this exchange rate")

	# ------------------------------------------------------------------
	# Pay: mirror of the Receive scenario
	# ------------------------------------------------------------------

	def test_pay_cross_currency_usd_from_ils_to(self):
		"""
		Pay: paid_from = USD (cheque/bank), paid_to = ILS (supplier account).
		row_paid_amount = 1 000 USD (entered in paid_from currency).
		stored_exchange_rate = 3.159059 (USD → ILS).

		Expected:
		  paid_amount          = 1 000 USD
		  received_amount      = 3 159.059 ILS
		  source_exchange_rate = 3.159059
		  target_exchange_rate = 1
		"""
		result = _compute_payment_entry_amounts(
			row_paid_amount=1000.0,
			paid_from_currency="USD",
			paid_to_currency="ILS",
			company_currency="ILS",
			stored_exchange_rate=3.159059,
			payment_type="Pay",
		)
		self.assertAlmostEqual(result["paid_amount"], 1000.0, places=3)
		self.assertAlmostEqual(result["received_amount"], 3159.059, places=3)
		self.assertAlmostEqual(result["source_exchange_rate"], 3.159059, places=6)
		self.assertAlmostEqual(result["target_exchange_rate"], 1.0, places=6)
		self.assertEqual(result["paid_from_account_currency"], "USD")
		self.assertEqual(result["paid_to_account_currency"], "ILS")

	# ------------------------------------------------------------------
	# Same-currency (no conversion)
	# ------------------------------------------------------------------

	def test_same_currency_ils_both(self):
		"""When both accounts are ILS, all amounts equal and rates = 1."""
		result = _compute_payment_entry_amounts(
			row_paid_amount=5000.0,
			paid_from_currency="ILS",
			paid_to_currency="ILS",
			company_currency="ILS",
			stored_exchange_rate=1.0,
			payment_type="Receive",
		)
		self.assertAlmostEqual(result["paid_amount"], 5000.0, places=3)
		self.assertAlmostEqual(result["received_amount"], 5000.0, places=3)
		self.assertEqual(result["source_exchange_rate"], 1.0)
		self.assertEqual(result["target_exchange_rate"], 1.0)

	def test_same_currency_rate_one_even_if_stored_rate_wrong(self):
		"""Same currency: exchange rates must be 1 regardless of stored_exchange_rate."""
		result = _compute_payment_entry_amounts(5000.0, "ILS", "ILS", "ILS", 3.5, "Pay")
		self.assertEqual(result["source_exchange_rate"], 1.0)
		self.assertEqual(result["target_exchange_rate"], 1.0)
		self.assertAlmostEqual(result["paid_amount"], 5000.0, places=3)

	# ------------------------------------------------------------------
	# ERPNext GL invariant: base_paid == base_received
	# ------------------------------------------------------------------

	def test_gl_balance_receive(self):
		"""base_paid_amount must equal base_received_amount (GL invariant)."""
		result = _compute_payment_entry_amounts(1000.0, "ILS", "USD", "ILS", 3.159059, "Receive")
		base_paid = result["paid_amount"] * result["source_exchange_rate"]
		base_received = result["received_amount"] * result["target_exchange_rate"]
		self.assertAlmostEqual(base_paid, base_received, places=2,
			msg=f"GL imbalance: base_paid={base_paid} ≠ base_received={base_received}")

	def test_gl_balance_pay(self):
		"""GL invariant for Pay type."""
		result = _compute_payment_entry_amounts(1000.0, "USD", "ILS", "ILS", 3.159059, "Pay")
		base_paid = result["paid_amount"] * result["source_exchange_rate"]
		base_received = result["received_amount"] * result["target_exchange_rate"]
		self.assertAlmostEqual(base_paid, base_received, places=2)

	# ------------------------------------------------------------------
	# source_exchange_rate = 1 only when paid_from = company currency
	# ------------------------------------------------------------------

	def test_source_rate_is_1_only_when_paid_from_equals_company(self):
		"""source_exchange_rate must NOT be 1 if paid_from is a foreign currency."""
		result = _compute_payment_entry_amounts(1000.0, "USD", "ILS", "ILS", 3.159059, "Pay")
		self.assertNotEqual(result["source_exchange_rate"], 1.0,
			msg="source_exchange_rate must not default to 1 for a foreign paid_from account")


if __name__ == "__main__":
	unittest.main()

