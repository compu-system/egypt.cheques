# -*- coding: utf-8 -*-
from frappe import _


def get_dashboard_data(data=None, **kwargs):
    if data is None:
        data = {}

    data.setdefault("non_standard_fieldnames", {})
    data.setdefault("dynamic_links", {})
    data.setdefault("transactions", [])

    data["non_standard_fieldnames"]["Journal Entry"] = "reference_link"
    data["dynamic_links"]["reference_link"] = ["reference_doctype", "Payment Entry"]

    cheque_label = _("Cheque Journal Entries")
    existing_labels = [t.get("label") for t in data["transactions"]]
    if cheque_label not in existing_labels:
        data["transactions"].append({
            "label": cheque_label,
            "items": ["Journal Entry"]
        })

    return data
