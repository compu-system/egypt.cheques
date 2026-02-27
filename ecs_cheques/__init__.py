
__version__ = '0.0.1'


# ---------------------------------------------------------------------------
# Issue 3: General Ledger report – fix transaction_currency display
#
# When "Add Columns in Transaction Currency" is enabled, each data row should
# carry a ``transaction_currency`` value so that Frappe's Currency column
# formatter can display amounts with the correct currency symbol.
# Summary rows (Opening / Total / Closing) don't carry a transaction currency
# since they may span multiple currencies; individual GL entry rows receive
# their currency from the database query.  Any row that is still missing
# ``transaction_currency`` (e.g. rows from older GL entries that were created
# before this field was added) falls back to ``account_currency`` so that the
# column is never blank.
# ---------------------------------------------------------------------------
try:
    import erpnext.accounts.report.general_ledger.general_ledger as _gl_report
    from ecs_cheques.ecs_cheques.overrides.general_ledger.general_ledger import _fix_account_currency_per_row

    _orig_get_result_as_list = _gl_report.get_result_as_list

    def _patched_get_result_as_list(data, filters):
        result = _orig_get_result_as_list(data, filters)

        if filters.get("add_values_in_transaction_currency"):
            # First: fix per-row account_currency from Payment Entry / Account master
            _fix_account_currency_per_row(result)

            # Then: fallback for any remaining rows without transaction_currency
            fallback_currency = (
                filters.get("account_currency")
                or filters.get("presentation_currency")
                or ""
            )
            for row in result:
                if not row.get("transaction_currency"):
                    row["transaction_currency"] = (
                        row.get("account_currency") or fallback_currency
                    )

        return result

    _gl_report.get_result_as_list = _patched_get_result_as_list

except (ImportError, AttributeError):
    # ERPNext not installed or module path changed – skip the patch silently.
    pass
