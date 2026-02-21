# Copyright (c) 2021, erpcloud.systems and contributors
# For license information, please see license.txt

import frappe
import json
import io
from frappe.model.document import Document
from frappe import _
from frappe.utils import flt, nowdate


class MultipleChequeEntry(Document):
	def on_cancel(self):
		"""Cancel linked Payment Entries when Multiple Cheque Entry is cancelled."""
		pe_names = self._get_linked_payment_entries()
		for pe_name in pe_names:
			try:
				pe = frappe.get_doc("Payment Entry", pe_name)
				if pe.docstatus == 1:
					pe.cancel()
			except Exception as e:
				frappe.throw(_("Failed to cancel Payment Entry {0}: {1}").format(pe_name, str(e)))

	def on_trash(self):
		"""Delete linked Payment Entries when Multiple Cheque Entry is deleted."""
		pe_names = self._get_linked_payment_entries()
		for pe_name in pe_names:
			try:
				pe = frappe.get_doc("Payment Entry", pe_name)
				if pe.docstatus == 2:
					frappe.delete_doc("Payment Entry", pe_name, ignore_permissions=True)
			except Exception as e:
				frappe.throw(_("Failed to delete Payment Entry {0}: {1}").format(pe_name, str(e)))

	def _get_linked_payment_entries(self):
		"""Return list of Payment Entry names linked to this document."""
		return frappe.get_all(
			"Payment Entry",
			filters={"reference_doctype": "Multiple Cheque Entry", "reference_link": self.name},
			pluck="name"
		)


@frappe.whitelist()
def get_cheques_excel_template(payment_type):
	"""Return an Excel (.xlsx) template with headers and 3 sample rows for the cheque table."""
	try:
		import openpyxl
	except ImportError:
		frappe.throw(_("openpyxl is required to generate Excel templates. Please install it."))

	wb = openpyxl.Workbook()
	ws = wb.active

	if payment_type == "Receive":
		ws.title = "Cheques Receive"
		headers = [
			"party_type", "party", "mode_of_payment", "bank",
			"reference_no", "reference_date", "cheque_type",
			"cheque_currency", "paid_amount", "target_exchange_rate",
			"account_paid_from", "account_paid_to",
			"first_beneficiary", "person_name", "issuer_name"
		]
		samples = [
			["Customer", "CUST-001", "شيك", "National Bank",
			 "CHQ-001", "2024-01-15", "Crossed",
			 "EGP", 5000, 1,
			 "1310 - مدينون - O", "1110 - بنك - O",
			 "Company", "", "Ahmed Ali"],
			["Customer", "CUST-002", "شيك", "ABC Bank",
			 "CHQ-002", "2024-01-20", "Opened",
			 "USD", 1000, 48.5,
			 "1310 - مدينون - O", "1111 - بنك دولار - O",
			 "Personal", "Mohamed Said", "Mohamed Said"],
			["Supplier", "SUPP-001", "شيك", "National Bank",
			 "CHQ-003", "2024-02-01", "Crossed",
			 "EGP", 12000, 1,
			 "2110 - دائنون - O", "1110 - بنك - O",
			 "", "", ""],
		]
	else:
		ws.title = "Cheques Pay"
		headers = [
			"party_type", "party", "mode_of_payment",
			"reference_no", "reference_date", "cheque_type",
			"cheque_currency", "paid_amount", "target_exchange_rate",
			"account_paid_from", "account_paid_to",
			"first_beneficiary", "person_name", "issuer_name"
		]
		samples = [
			["Supplier", "SUPP-001", "شيك",
			 "CHQ-PAY-001", "2024-01-15", "Crossed",
			 "EGP", 8000, 1,
			 "1110 - بنك - O", "2110 - دائنون - O",
			 "", "", ""],
			["Supplier", "SUPP-002", "شيك",
			 "CHQ-PAY-002", "2024-01-22", "Opened",
			 "USD", 500, 48.5,
			 "1111 - بنك دولار - O", "2110 - دائنون - O",
			 "", "", ""],
			["Customer", "CUST-001", "شيك",
			 "CHQ-PAY-003", "2024-02-05", "Crossed",
			 "EGP", 3000, 1,
			 "1110 - بنك - O", "1310 - مدينون - O",
			 "", "", ""],
		]

	ws.append(headers)
	for sample in samples:
		ws.append(sample)

	output = io.BytesIO()
	wb.save(output)
	output.seek(0)

	frappe.response.filename = "cheques_template_{}.xlsx".format(payment_type.lower())
	frappe.response.filecontent = output.read()
	frappe.response.type = "binary"


@frappe.whitelist()
def upload_cheques_excel(file_data, payment_type):
	"""Parse uploaded Excel file and return rows as list of dicts for the cheque table."""
	try:
		import openpyxl
	except ImportError:
		frappe.throw(_("openpyxl is required to upload Excel files. Please install it."))

	if isinstance(file_data, str):
		import base64
		file_bytes = base64.b64decode(file_data)
	else:
		file_bytes = file_data

	wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
	ws = wb.active

	rows = list(ws.iter_rows(values_only=True))
	if not rows:
		frappe.throw(_("Excel file is empty."))

	headers = [str(h).strip() if h else "" for h in rows[0]]
	required_cols = ["party_type", "party", "reference_no", "reference_date",
					 "cheque_type", "paid_amount"]

	missing = [c for c in required_cols if c not in headers]
	if missing:
		frappe.throw(_("Missing required columns: {0}").format(", ".join(missing)))

	result = []
	errors = []
	for i, row in enumerate(rows[1:], start=2):
		row_dict = {headers[j]: row[j] for j in range(len(headers)) if j < len(row)}

		# Basic validation
		for col in required_cols:
			if not row_dict.get(col):
				errors.append(_("Row {0}: '{1}' is required.").format(i, col))

		paid_amount = row_dict.get("paid_amount")
		if paid_amount is not None:
			try:
				row_dict["paid_amount"] = flt(paid_amount)
				if row_dict["paid_amount"] <= 0:
					errors.append(_("Row {0}: 'paid_amount' must be greater than zero.").format(i))
			except Exception:
				errors.append(_("Row {0}: 'paid_amount' must be a number.").format(i))

		exchange_rate = row_dict.get("target_exchange_rate")
		if exchange_rate is not None:
			try:
				row_dict["target_exchange_rate"] = flt(exchange_rate) or 1
			except Exception:
				row_dict["target_exchange_rate"] = 1

		# Convert date to string
		ref_date = row_dict.get("reference_date")
		if ref_date and not isinstance(ref_date, str):
			row_dict["reference_date"] = str(ref_date.date()) if hasattr(ref_date, 'date') else str(ref_date)

		result.append(row_dict)

	if errors:
		frappe.throw("<br>".join(errors))

	return result
