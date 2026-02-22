# -*- coding: utf-8 -*-
from frappe import _


def get_dashboard_data():
    return {
        "non_standard_fieldnames": {
            "Journal Entry": "reference_link"
        },
        "dynamic_links": {
            "reference_link": ["reference_doctype", "Payment Entry"]
        },
        "transactions": [
            {
                "label": _("Cheque Journal Entries"),
                "items": ["Journal Entry"]
            }
        ]
    }
