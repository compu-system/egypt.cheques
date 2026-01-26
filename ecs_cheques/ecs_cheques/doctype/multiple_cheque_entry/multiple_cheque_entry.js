// Copyright (c) 2021, erpcloud.systems and contributors
// Full Corrected Code for Multiple Cheque Entry

function get_exchange_rate(from_currency, to_currency, date) {
    return new Promise((resolve) => {
        if (from_currency === to_currency) {
            resolve(1);
            return;
        }
        // Ensure date format is safe for moment.js
        const check_date = date || frappe.datetime.get_today();
        
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Currency Exchange",
                filters: {
                    from_currency: from_currency,
                    to_currency: to_currency,
                    date: ["<=", check_date]
                },
                fields: ["exchange_rate"],
                order_by: "date desc",
                limit_page_length: 1
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    resolve(r.message[0].exchange_rate);
                } else {
                    frappe.call({
                        method: "frappe.client.get_list",
                        args: {
                            doctype: "Currency Exchange",
                            filters: {
                                from_currency: to_currency,
                                to_currency: from_currency,
                                date: ["<=", check_date]
                            },
                            fields: ["exchange_rate"],
                            order_by: "date desc",
                            limit_page_length: 1
                        },
                        callback: function(r2) {
                            if (r2.message && r2.message.length > 0) {
                                resolve(1 / r2.message[0].exchange_rate);
                            } else {
                                resolve(1);
                            }
                        }
                    });
                }
            }
        });
    });
}

frappe.ui.form.on("Multiple Cheque Entry", {
    setup: function(frm) {
        frm.set_query("bank_acc", function() {
            return { filters: [["Bank Account", "bank", "in", frm.doc.cheque_bank || ""]] };
        });
        
        frm.set_query("cheque_bank", function() {
            return { filters: [["Bank", "company_bank", "=", '1']] };
        });
        
        frm.set_query("mode_of_payment", function() {
            return { filters: [["Mode of Payment", "enabled", "=", 1]] };
        });
        
        frm.set_query("party_type", function() {
            return { filters: [["DocType", "name", "in", ["Customer", "Supplier"]]] };
        });
        
        if (frm.fields_dict.cheque_table) {
            frm.fields_dict.cheque_table.grid.get_field('account_paid_to').get_query = () => ({ filters: [["Account", "account_type", "in", ["Bank", "Cash"]]] });
            frm.fields_dict.cheque_table.grid.get_field('account_paid_from').get_query = () => ({ filters: [["Account", "account_type", "in", ["Receivable", "Payable"]]] });
            frm.fields_dict.cheque_table.grid.update_docfield_property('party', 'options', 'party_type');
        }
        
        if (frm.fields_dict.cheque_table_2) {
            frm.fields_dict.cheque_table_2.grid.get_field('account_paid_to').get_query = () => ({ filters: [["Account", "account_type", "in", ["Payable"]]] });
            frm.fields_dict.cheque_table_2.grid.get_field('account_paid_from').get_query = () => ({ filters: [["Account", "account_type", "in", ["Bank", "Cash"]]] });
            frm.fields_dict.cheque_table_2.grid.update_docfield_property('party', 'options', 'party_type');
        }
    },
    
    refresh: function(frm) {
        if (frm.doc.party && frm.doc.party_name) {
            [frm.doc.cheque_table, frm.doc.cheque_table_2].forEach(table => {
                if (table) table.forEach(row => { if (!row.issuer_name) row.issuer_name = frm.doc.party_name; });
            });
            frm.refresh_field('cheque_table');
            frm.refresh_field('cheque_table_2');
        }
    },

    validate: function(frm) {
        // FIXED: Condition removed to avoid throwing error for non-cheque payments
        const isPay = frm.doc.payment_type === "Pay";
        const table = isPay ? frm.doc.cheque_table_2 : frm.doc.cheque_table;
        
        if (!table || !table.length) {
            frappe.throw(__("Please add cheque entries before submitting."));
        }
    },

    on_submit: function(frm) {
        const isPay = frm.doc.payment_type === "Pay";
        const isReceive = frm.doc.payment_type === "Receive";
        const table = isPay ? frm.doc.cheque_table_2 : frm.doc.cheque_table;
        
        let promises = [];
        
        table.forEach((row) => {
            if (!row.payment_entry) {
                const doc = {
                    doctype: "Payment Entry",
                    posting_date: frm.doc.posting_date || frappe.datetime.get_today(),
                    payment_type: frm.doc.payment_type,
                    mode_of_payment: row.mode_of_payment || frm.doc.mode_of_payment,
                    party_type: row.party_type,
                    party: row.party,
                    paid_from: row.account_paid_from,
                    paid_to: row.account_paid_to,
                    paid_from_account_currency: row.account_currency_from,
                    paid_to_account_currency: row.account_currency,
                    target_exchange_rate: row.target_exchange_rate || 1,
                    reference_no: row.reference_no,
                    reference_date: row.reference_date || frappe.datetime.get_today(),
                    issuer_name: row.issuer_name,
                    reference_doctype: "Multiple Cheque Entry",
                    reference_link: frm.doc.name
                };

                if (isReceive) {
                    doc.received_amount = row.paid_amount;
                    doc.paid_amount = row.paid_amount * (row.target_exchange_rate || 1);
                    doc.drawn_bank = row.bank;
                } else {
                    doc.paid_amount = row.paid_amount;
                    doc.received_amount = row.paid_amount * (row.target_exchange_rate || 1);
                }

                promises.push(new Promise((resolve) => {
                    frappe.call({
                        method: "frappe.client.insert",
                        args: { doc: doc },
                        callback: function(inserted) {
                            if (inserted.message) {
                                frappe.call({
                                    method: "frappe.client.submit",
                                    args: { doc: inserted.message },
                                    callback: function(submitted) {
                                        const child_dt = isPay ? "Cheque Table Pay" : "Cheque Table Receive";
                                        frappe.db.set_value(child_dt, row.name, "payment_entry", submitted.message.name)
                                            .then(() => resolve());
                                    }
                                });
                            }
                        }
                    });
                }));
            }
        });

        if (promises.length > 0) {
            Promise.all(promises).then(() => {
                frappe.msgprint(__("تم إنشاء السندات بنجاح."));
                frm.reload_doc();
            });
        }
    }
});

// Handlers for Party and Auto-fill
frappe.ui.form.on("Multiple Cheque Entry", "party", function(frm) {
    if (!frm.doc.party) return;
    const field = frm.doc.party_type === "Customer" ? "customer_name" : "supplier_name";
    frappe.call({
        method: "frappe.client.get_value",
        args: { doctype: frm.doc.party_type, fieldname: field, filters: { name: frm.doc.party } },
        callback: (r) => { if(r.message) frm.set_value("party_name", r.message[field]); }
    });
});

// Row Helper function
function update_target_exchange_rate(frm, row, table_name) {
    if (!row.account_currency_from || !row.account_currency) return;
    if (row.account_currency_from === row.account_currency) {
        frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", 1);
        return;
    }
    const posting_date = frm.doc.posting_date || frappe.datetime.get_today();
    const from_curr = table_name === 'cheque_table' ? row.account_currency : row.account_currency_from;
    const to_curr = table_name === 'cheque_table' ? row.account_currency_from : row.account_currency;

    get_exchange_rate(from_curr, to_curr, posting_date).then(rate => {
        frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", rate);
        frm.refresh_field(table_name);
    });
}

// Child Table Triggers
frappe.ui.form.on("Cheque Table Receive", {
    account_paid_to: (frm, cdt, cdn) => {
        const row = locals[cdt][cdn];
        frappe.call({
            method: "frappe.client.get_value",
            args: { doctype: "Account", fieldname: "account_currency", filters: { name: row.account_paid_to } },
            callback: (r) => {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "account_currency", r.message.account_currency);
                    update_target_exchange_rate(frm, row, 'cheque_table');
                }
            }
        });
    }
});

frappe.ui.form.on("Cheque Table Pay", {
    account_paid_from: (frm, cdt, cdn) => {
        const row = locals[cdt][cdn];
        frappe.call({
            method: "frappe.client.get_value",
            args: { doctype: "Account", fieldname: "account_currency", filters: { name: row.account_paid_from } },
            callback: (r) => {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "account_currency_from", r.message.account_currency);
                    update_target_exchange_rate(frm, row, 'cheque_table_2');
                }
            }
        });
    }
});
