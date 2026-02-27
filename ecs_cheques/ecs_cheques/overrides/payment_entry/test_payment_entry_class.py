# Copyright (c) 2024, erpcloud.systems and Contributors
# See license.txt
"""
Unit tests for CustomPaymentEntry._sync_amounts_for_same_currency.

These tests verify the corrected exchange-rate logic:
  - When paid_from_account_currency == paid_to_account_currency == company currency
    → exchange rates are forced to 1 and received_amount is synced.
  - When paid_from_account_currency == paid_to_account_currency != company currency
    (e.g. both ILS but company USD)
    → exchange rates are left untouched; only received_amount is synced.
  - On a submitted document (docstatus != 0), nothing is mutated.

Tests run without a live Frappe/ERPNext instance by using stubs.
"""

import sys
import types
import unittest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Minimal Frappe stub (mirrors the one in test_payment_entry_je.py)
# ---------------------------------------------------------------------------

def _make_frappe_stub():
    frappe_mod = types.ModuleType("frappe")
    frappe_mod.db = MagicMock()
    frappe_mod._ = lambda s, *a: s

    class _ValidationError(Exception):
        pass

    frappe_mod.ValidationError = _ValidationError

    def _throw(msg, exc=None):
        raise (exc or _ValidationError)(msg)

    frappe_mod.throw = _throw
    frappe_mod.get_cached_value = MagicMock()
    frappe_mod.get_all = MagicMock(return_value=[])
    return frappe_mod


_frappe_stub = _make_frappe_stub()
sys.modules.setdefault("frappe", _frappe_stub)
sys.modules.setdefault("frappe.model", types.ModuleType("frappe.model"))
sys.modules.setdefault("frappe.model.document", types.ModuleType("frappe.model.document"))
sys.modules["frappe.model.document"].Document = object

_utils_mod = types.ModuleType("frappe.utils")


def _flt(val, precision=None):
    try:
        v = float(val or 0)
    except (TypeError, ValueError):
        v = 0.0
    if precision is not None:
        v = round(v, precision)
    return v


_utils_mod.flt = _flt
sys.modules["frappe.utils"] = _utils_mod

# Stub out erpnext imports pulled in by payment_entry_class
_erpnext_stub = types.ModuleType("erpnext")
sys.modules.setdefault("erpnext", _erpnext_stub)
_accts_stub = types.ModuleType("erpnext.accounts")
sys.modules.setdefault("erpnext.accounts", _accts_stub)
_pe_pkg = types.ModuleType("erpnext.accounts.doctype")
sys.modules.setdefault("erpnext.accounts.doctype", _pe_pkg)
_pe_dt = types.ModuleType("erpnext.accounts.doctype.payment_entry")
sys.modules.setdefault("erpnext.accounts.doctype.payment_entry", _pe_dt)


class _FakePaymentEntry:
    """Minimal PaymentEntry base-class stub."""

    def validate(self):
        pass

    def on_submit(self):
        pass


_pe_mod = types.ModuleType("erpnext.accounts.doctype.payment_entry.payment_entry")
_pe_mod.PaymentEntry = _FakePaymentEntry
sys.modules["erpnext.accounts.doctype.payment_entry.payment_entry"] = _pe_mod

# Now import the class under test.
from ecs_cheques.ecs_cheques.overrides.payment_entry.payment_entry_class import (  # noqa: E402
    CustomPaymentEntry,
)

import frappe  # noqa: E402  (the stub registered above)


# ---------------------------------------------------------------------------
# Helper: build a minimal CustomPaymentEntry instance
# ---------------------------------------------------------------------------

def _make_entry(
    paid_from_currency,
    paid_to_currency,
    paid_amount,
    received_amount=None,
    source_exchange_rate=1.0,
    target_exchange_rate=1.0,
    company="Test Company",
    docstatus=0,
):
    """Return a CustomPaymentEntry with the given field values."""
    entry = CustomPaymentEntry.__new__(CustomPaymentEntry)
    entry.paid_from_account_currency = paid_from_currency
    entry.paid_to_account_currency = paid_to_currency
    entry.paid_amount = paid_amount
    entry.received_amount = received_amount if received_amount is not None else paid_amount
    entry.source_exchange_rate = source_exchange_rate
    entry.target_exchange_rate = target_exchange_rate
    entry.company = company
    entry.docstatus = docstatus
    return entry


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSyncAmountsForSameCurrency(unittest.TestCase):
    """_sync_amounts_for_same_currency correctness tests."""

    def _patch_company_currency(self, company_currency):
        """Patch frappe.get_cached_value to return company_currency."""
        return patch.object(
            frappe, "get_cached_value", return_value=company_currency
        )

    # ------------------------------------------------------------------
    # Case 1: currencies differ → nothing should change
    # ------------------------------------------------------------------

    def test_different_currencies_no_change(self):
        """When from/to currencies differ the method must be a no-op."""
        entry = _make_entry("ILS", "USD", 1000, received_amount=900,
                            source_exchange_rate=3.5, target_exchange_rate=3.5)
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        self.assertEqual(entry.source_exchange_rate, 3.5)
        self.assertEqual(entry.target_exchange_rate, 3.5)
        self.assertEqual(entry.received_amount, 900)

    # ------------------------------------------------------------------
    # Case 2: same currency == company currency → rates forced to 1
    # ------------------------------------------------------------------

    def test_same_currency_equals_company_currency_forces_rates_to_one(self):
        """paid_from == paid_to == company currency → exchange rates = 1."""
        entry = _make_entry("USD", "USD", 500, source_exchange_rate=1.2,
                            target_exchange_rate=1.2)
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        self.assertEqual(entry.source_exchange_rate, 1)
        self.assertEqual(entry.target_exchange_rate, 1)

    def test_same_currency_equals_company_currency_syncs_received_amount(self):
        """received_amount must be synced to paid_amount when currencies match."""
        entry = _make_entry("USD", "USD", 500, received_amount=400)
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        self.assertEqual(entry.received_amount, 500)

    # ------------------------------------------------------------------
    # Case 3: same currency != company currency → rates NOT forced to 1
    # ------------------------------------------------------------------

    def test_same_foreign_currency_does_not_force_rates_to_one(self):
        """paid_from == paid_to == ILS but company is USD → rates untouched."""
        entry = _make_entry("ILS", "ILS", 3721, source_exchange_rate=0.27,
                            target_exchange_rate=0.27)
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        # Rates must NOT be forced to 1
        self.assertAlmostEqual(entry.source_exchange_rate, 0.27)
        self.assertAlmostEqual(entry.target_exchange_rate, 0.27)

    def test_same_foreign_currency_still_syncs_received_amount(self):
        """received_amount must be synced even when rates are NOT forced to 1."""
        entry = _make_entry("ILS", "ILS", 3721, received_amount=3000,
                            source_exchange_rate=0.27, target_exchange_rate=0.27)
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        self.assertEqual(entry.received_amount, 3721)

    # ------------------------------------------------------------------
    # Case 4: submitted document → nothing mutated
    # ------------------------------------------------------------------

    def test_submitted_document_no_mutation(self):
        """On a submitted document (docstatus=1) nothing should be changed."""
        entry = _make_entry("USD", "USD", 500, received_amount=400,
                            source_exchange_rate=1.2, target_exchange_rate=1.2,
                            docstatus=1)
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        # Nothing should be mutated
        self.assertEqual(entry.source_exchange_rate, 1.2)
        self.assertEqual(entry.target_exchange_rate, 1.2)
        self.assertEqual(entry.received_amount, 400)

    def test_submitted_foreign_same_currency_no_mutation(self):
        """Submitted doc with foreign same-currency pair: no mutation at all."""
        entry = _make_entry("ILS", "ILS", 3721, received_amount=3000,
                            source_exchange_rate=0.27, target_exchange_rate=0.27,
                            docstatus=1)
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        self.assertAlmostEqual(entry.source_exchange_rate, 0.27)
        self.assertEqual(entry.received_amount, 3000)

    # ------------------------------------------------------------------
    # Case 5: missing currency fields → no-op
    # ------------------------------------------------------------------

    def test_missing_paid_from_currency_no_op(self):
        """When paid_from_account_currency is blank, the method is a no-op."""
        entry = _make_entry(None, "USD", 500, source_exchange_rate=1.2)
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        self.assertEqual(entry.source_exchange_rate, 1.2)

    def test_missing_paid_to_currency_no_op(self):
        """When paid_to_account_currency is blank, the method is a no-op."""
        entry = _make_entry("USD", None, 500, source_exchange_rate=1.2)
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        self.assertEqual(entry.source_exchange_rate, 1.2)

    # ------------------------------------------------------------------
    # Case 6: received_amount already correct → no spurious update
    # ------------------------------------------------------------------

    def test_received_amount_already_equal_no_change(self):
        """When received_amount already equals paid_amount it stays unchanged."""
        entry = _make_entry("USD", "USD", 500, received_amount=500)
        original_received = entry.received_amount
        with self._patch_company_currency("USD"):
            entry._sync_amounts_for_same_currency()
        self.assertEqual(entry.received_amount, original_received)


if __name__ == "__main__":
    unittest.main()
