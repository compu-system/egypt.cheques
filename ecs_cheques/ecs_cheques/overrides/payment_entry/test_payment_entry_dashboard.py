# Copyright (c) 2021, erpcloud.systems and Contributors
# See license.txt
"""
Smoke tests for the dashboard override in dashboard.py.

These tests verify that get_dashboard_data() can be called both with and
without the ``data`` keyword argument introduced in Frappe 15.97, and that
it correctly merges/extends the incoming data dictionary.

Tests run with Python's built-in unittest and do NOT require a live
Frappe/ERPNext instance.
"""
import sys
import types
import unittest


# ---------------------------------------------------------------------------
# Bootstrap a minimal frappe stub so the module under test can be imported
# without a running Frappe instance.
# ---------------------------------------------------------------------------

_frappe_mod = sys.modules.get("frappe")
if _frappe_mod is None:
    _frappe_mod = types.ModuleType("frappe")
    _frappe_mod._ = lambda s, *a: s
    sys.modules["frappe"] = _frappe_mod
elif not hasattr(_frappe_mod, "_"):
    _frappe_mod._ = lambda s, *a: s

from ecs_cheques.ecs_cheques.overrides.payment_entry.dashboard import (  # noqa: E402
    get_dashboard_data,
)


class TestGetDashboardDataSignature(unittest.TestCase):
    """Verify that get_dashboard_data accepts the Frappe 15.97 call style."""

    def test_call_without_arguments_does_not_raise(self):
        """get_dashboard_data() must work with no arguments (legacy style)."""
        result = get_dashboard_data()
        self.assertIsInstance(result, dict)

    def test_call_with_data_keyword_does_not_raise(self):
        """get_dashboard_data(data={}) must not raise a TypeError."""
        result = get_dashboard_data(data={})
        self.assertIsInstance(result, dict)

    def test_call_with_data_none_does_not_raise(self):
        """get_dashboard_data(data=None) must not raise."""
        result = get_dashboard_data(data=None)
        self.assertIsInstance(result, dict)


class TestGetDashboardDataContent(unittest.TestCase):
    """Verify that the function populates the expected keys."""

    def _call(self, data=None):
        return get_dashboard_data(data=data)

    def test_non_standard_fieldnames_journal_entry(self):
        result = self._call()
        self.assertEqual(
            result["non_standard_fieldnames"].get("Journal Entry"),
            "reference_link",
        )

    def test_dynamic_links_reference_link(self):
        result = self._call()
        self.assertEqual(
            result["dynamic_links"].get("reference_link"),
            ["reference_doctype", "Payment Entry"],
        )

    def test_transactions_contains_cheque_journal_entries(self):
        result = self._call()
        labels = [t.get("label") for t in result["transactions"]]
        self.assertIn("Cheque Journal Entries", labels)

    def test_cheque_journal_entries_block_has_journal_entry_item(self):
        result = self._call()
        block = next(
            (t for t in result["transactions"] if t.get("label") == "Cheque Journal Entries"),
            None,
        )
        self.assertIsNotNone(block)
        self.assertIn("Journal Entry", block["items"])


class TestGetDashboardDataMerge(unittest.TestCase):
    """Verify that existing data is extended, not replaced."""

    def test_existing_transactions_are_preserved(self):
        """Blocks already in data["transactions"] must survive the call."""
        existing_block = {"label": "Existing Block", "items": ["Sales Invoice"]}
        data = {"transactions": [existing_block]}
        result = get_dashboard_data(data=data)
        labels = [t.get("label") for t in result["transactions"]]
        self.assertIn("Existing Block", labels)
        self.assertIn("Cheque Journal Entries", labels)

    def test_cheque_block_not_duplicated_on_second_call(self):
        """Calling the function twice must not produce duplicate transaction blocks."""
        data = {}
        get_dashboard_data(data=data)
        get_dashboard_data(data=data)
        cheque_blocks = [
            t for t in data["transactions"]
            if t.get("label") == "Cheque Journal Entries"
        ]
        self.assertEqual(len(cheque_blocks), 1)

    def test_existing_non_standard_fieldnames_preserved(self):
        """Pre-existing non_standard_fieldnames entries must be kept."""
        data = {"non_standard_fieldnames": {"Sales Invoice": "custom_field"}}
        result = get_dashboard_data(data=data)
        self.assertEqual(result["non_standard_fieldnames"]["Sales Invoice"], "custom_field")
        self.assertEqual(result["non_standard_fieldnames"]["Journal Entry"], "reference_link")

    def test_returns_same_dict_object(self):
        """The returned dict must be the same object that was passed in."""
        data = {}
        result = get_dashboard_data(data=data)
        self.assertIs(result, data)


if __name__ == "__main__":
    unittest.main()
