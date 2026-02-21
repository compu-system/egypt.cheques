// Copyright (c) 2021, erpcloud.systems and contributors
// For license information, please see license.txt

// Utility: parse float safely
function flt(val) { return parseFloat(val) || 0; }

// Helper function to get exchange rate
function get_exchange_rate(from_currency, to_currency, date) {
    return new Promise((resolve) => {
        if (from_currency === to_currency) {
            resolve(1);
            return;
        }
        
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Currency Exchange",
                filters: {
                    from_currency: from_currency,
                    to_currency: to_currency,
                    date: ["<=", date]
                },
                fields: ["exchange_rate"],
                order_by: "date desc",
                limit_page_length: 1
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    resolve(r.message[0].exchange_rate);
                } else {
                    // Try reverse
                    frappe.call({
                        method: "frappe.client.get_list",
                        args: {
                            doctype: "Currency Exchange",
                            filters: {
                                from_currency: to_currency,
                                to_currency: from_currency,
                                date: ["<=", date]
                            },
                            fields: ["exchange_rate"],
                            order_by: "date desc",
                            limit_page_length: 1
                        },
                        callback: function(r2) {
                            if (r2.message && r2.message.length > 0) {
                                resolve(1 / r2.message[0].exchange_rate);
                            } else {
                                resolve(null);
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
        // Bank Account Query
        frm.set_query("bank_acc", function() {
            return {
                filters: [
                    ["Bank Account", "bank", "in", frm.doc.cheque_bank]
                ]
            };
        });
        
        // Cheque Bank Query
        frm.set_query("cheque_bank", function() {
            return {
                filters: [
                    ["Bank", "company_bank", "=", '1']
                ]
            };
        });
        
        // Mode of Payment Query
        frm.set_query("mode_of_payment", function() {
            return {
                filters: [
                    ["Mode of Payment", "type", "=", 'Cheque']
                ]
            };
        });
        
        // Party Type Query
        frm.set_query("party_type", function() {
            return {
                filters: [
                    ["DocType", "name", "in", ["Customer", "Supplier"]]
                ]
            };
        });
        
        // Child Table Field Queries
        if (frm.fields_dict.cheque_table) {
            // Account Paid To Query
            frm.fields_dict.cheque_table.grid.get_field('account_paid_to').get_query = function() {
                return {
                    filters: [["Account", "account_type", "in", ["Bank", "Cash"]]]
                };
            };
            
            // Account Currency Query
            frm.fields_dict.cheque_table.grid.get_field('account_currency').get_query = function() {
                return {
                    filters: [["Currency", "enabled", "=", 1]]
                };
            };
            
            // Account Paid From Query
            frm.fields_dict.cheque_table.grid.get_field('account_paid_from').get_query = function() {
                return {
                    filters: [["Account", "account_type", "in", ["Receivable", "Payable"]]]
                };
            };
            
            // Account Currency From Query
            frm.fields_dict.cheque_table.grid.get_field('account_currency_from').get_query = function() {
                return {
                    filters: [["Currency", "enabled", "=", 1]]
                };
            };
            
            // Party Type Query for Child Table
            frm.fields_dict.cheque_table.grid.get_field('party_type').get_query = function() {
                return {
                    filters: [["DocType", "name", "in", ["Customer", "Supplier"]]]
                };
            };
            
            // Mode of Payment Query for Child Table
            frm.fields_dict.cheque_table.grid.get_field('mode_of_payment').get_query = function() {
                return {
                    filters: [["Mode of Payment", "type", "=", 'Cheque']]
                };
            };
            
            // Set Party as Dynamic Link to Party Type
            frm.fields_dict.cheque_table.grid.update_docfield_property('party', 'options', 'party_type');
            frm.fields_dict.cheque_table.grid.update_docfield_property('party', 'fieldname', 'party_type');
            
            // Set paid_amount currency to account_currency
            frm.fields_dict.cheque_table.grid.update_docfield_property('paid_amount', 'options', 'currency');
            frm.fields_dict.cheque_table.grid.update_docfield_property('paid_amount', 'currency', 'account_currency');
        }
        
        if (frm.fields_dict.cheque_table_2) {
            // Account Paid To Query
            frm.fields_dict.cheque_table_2.grid.get_field('account_paid_to').get_query = function() {
                return {
                    filters: [["Account", "account_type", "in", ["Payable"]]]
                };
            };
            
            // Account Currency Query
            frm.fields_dict.cheque_table_2.grid.get_field('account_currency').get_query = function() {
                return {
                    filters: [["Currency", "enabled", "=", 1]]
                };
            };
            
            // Account Paid From Query
            frm.fields_dict.cheque_table_2.grid.get_field('account_paid_from').get_query = function() {
                return {
                    filters: [["Account", "account_type", "in", ["Bank", "Cash"]]]
                };
            };
            
            // Account Currency From Query
            frm.fields_dict.cheque_table_2.grid.get_field('account_currency_from').get_query = function() {
                return {
                    filters: [["Currency", "enabled", "=", 1]]
                };
            };
            
            // Party Type Query for Child Table
            frm.fields_dict.cheque_table_2.grid.get_field('party_type').get_query = function() {
                return {
                    filters: [["DocType", "name", "in", ["Customer", "Supplier"]]]
                };
            };
            
            // Mode of Payment Query for Child Table
            frm.fields_dict.cheque_table_2.grid.get_field('mode_of_payment').get_query = function() {
                return {
                    filters: [["Mode of Payment", "type", "=", 'Cheque']]
                };
            };
            
            // Set Party as Dynamic Link to Party Type
            frm.fields_dict.cheque_table_2.grid.update_docfield_property('party', 'options', 'party_type');
            frm.fields_dict.cheque_table_2.grid.update_docfield_property('party', 'fieldname', 'party_type');
            
            // Set paid_amount currency to account_currency
            frm.fields_dict.cheque_table_2.grid.update_docfield_property('paid_amount', 'options', 'currency');
            frm.fields_dict.cheque_table_2.grid.update_docfield_property('paid_amount', 'currency', 'account_currency_from');
        }
    },
    
    refresh: function(frm) {
        // Copy party name to issuer_name in child tables
        if (frm.doc.party && frm.doc.party_name) {
            // Update Cheque Table Receive
            if (frm.fields_dict.cheque_table) {
                frm.doc.cheque_table.forEach(row => {
                    if (!row.issuer_name) {
                        row.issuer_name = frm.doc.party_name;
                    }
                });
                frm.refresh_field('cheque_table');
            }
            
            // Update Cheque Table Pay
            if (frm.fields_dict.cheque_table_2) {
                frm.doc.cheque_table_2.forEach(row => {
                    if (!row.issuer_name) {
                        row.issuer_name = frm.doc.party_name;
                    }
                });
                frm.refresh_field('cheque_table_2');
            }
        }
        
        // Add Excel buttons after render
        frappe.after_ajax(function() {
            add_excel_buttons(frm);
        });
    }
});
// Field Change Handlers
frappe.ui.form.on("Multiple Cheque Entry", "party_type", function(frm) {
    cur_frm.set_value("party", "");
    cur_frm.set_value("party_name", "");
});
frappe.ui.form.on("Multiple Cheque Entry", "cheque_bank", function(frm) {
    cur_frm.set_value("bank_acc", "");
    cur_frm.set_value("account", "");
    cur_frm.set_value("collection_fee_account", "");
    cur_frm.set_value("payable_account", "");
    
    // Clear child table bank accounts
    if (frm.fields_dict.cheque_table) {
        frm.doc.cheque_table.forEach(row => {
            row.account_paid_to = "";
            row.account_currency = "";
            row.target_exchange_rate = 1;
        });
        frm.refresh_field('cheque_table');
    }
    
    if (frm.fields_dict.cheque_table_2) {
        frm.doc.cheque_table_2.forEach(row => {
            row.account_paid_from = "";
            row.account_currency_from = "";
            row.target_exchange_rate = 1;
        });
        frm.refresh_field('cheque_table_2');
    }
});
frappe.ui.form.on("Multiple Cheque Entry", "bank_acc", function(frm) {
    cur_frm.set_value("account", "");
    cur_frm.set_value("collection_fee_account", "");
    cur_frm.set_value("payable_account", "");
    
    // Update child table bank accounts
    if (frm.fields_dict.cheque_table) {
        frm.doc.cheque_table.forEach(row => {
            row.account_paid_to = frm.doc.bank_acc;
            // Get account currency
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Account",
                    fieldname: "account_currency",
                    filters: { name: frm.doc.bank_acc }
                },
                callback: function(r) {
                    if (r.message) {
                        row.account_currency = r.message.account_currency;
                        // Update target exchange rate
                        update_target_exchange_rate(frm, row, 'cheque_table');
                        frm.refresh_field('cheque_table');
                    }
                }
            });
        });
        frm.refresh_field('cheque_table');
    }
    
    if (frm.fields_dict.cheque_table_2) {
        frm.doc.cheque_table_2.forEach(row => {
            row.account_paid_from = frm.doc.bank_acc;
            // Get account currency
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Account",
                    fieldname: "account_currency",
                    filters: { name: frm.doc.bank_acc }
                },
                callback: function(r) {
                    if (r.message) {
                        row.account_currency_from = r.message.account_currency;
                        // Update target exchange rate
                        update_target_exchange_rate(frm, row, 'cheque_table_2');
                        frm.refresh_field('cheque_table_2');
                    }
                }
            });
        });
        frm.refresh_field('cheque_table_2');
    }
});
frappe.ui.form.on("Multiple Cheque Entry", "mode_of_payment", function(frm) {
    if (!frm.doc.mode_of_payment) return;
    
    // Get mode of payment details
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Mode of Payment",
            name: frm.doc.mode_of_payment
        },
        callback: function(r) {
            if (r.message && r.message.accounts && r.message.accounts.length > 0) {
                const default_account = r.message.accounts[0].default_account;
                
                // Update child tables with default account
                if (frm.fields_dict.cheque_table) {
                    frm.doc.cheque_table.forEach(row => {
                        row.account_paid_to = default_account;
                        // Get account currency
                        frappe.call({
                            method: "frappe.client.get_value",
                            args: {
                                doctype: "Account",
                                fieldname: "account_currency",
                                filters: { name: default_account }
                            },
                            callback: function(r2) {
                                if (r2.message) {
                                    row.account_currency = r2.message.account_currency;
                                    // Update target exchange rate
                                    update_target_exchange_rate(frm, row, 'cheque_table');
                                    frm.refresh_field('cheque_table');
                                }
                            }
                        });
                    });
                    frm.refresh_field('cheque_table');
                }
                
                if (frm.fields_dict.cheque_table_2) {
                    frm.doc.cheque_table_2.forEach(row => {
                        row.account_paid_from = default_account;
                        // Get account currency
                        frappe.call({
                            method: "frappe.client.get_value",
                            args: {
                                doctype: "Account",
                                fieldname: "account_currency",
                                filters: { name: default_account }
                            },
                            callback: function(r2) {
                                if (r2.message) {
                                    row.account_currency_from = r2.message.account_currency;
                                    // Update target exchange rate
                                    update_target_exchange_rate(frm, row, 'cheque_table_2');
                                    frm.refresh_field('cheque_table_2');
                                }
                            }
                        });
                    });
                    frm.refresh_field('cheque_table_2');
                }
            }
        }
    });
});
frappe.ui.form.on('Multiple Cheque Entry', 'payment_type', function(frm) {
    // Set parent party_type
    if (frm.doc.payment_type == "Receive") {
        frm.set_value("party_type", "Customer");
    }
    if (frm.doc.payment_type == "Pay") {
        frm.set_value("party_type", "Supplier");
    }
    
    // Set child table party_type based on payment_type
    const party_type_value = frm.doc.payment_type === 'Receive' ? 'Customer' : 'Supplier';
    
    // Update Cheque Table Receive
    if (frm.fields_dict.cheque_table) {
        frm.doc.cheque_table.forEach(row => {
            row.party_type = party_type_value;
            row.party = '';
            row.party_name = '';
            row.account_paid_from = '';
            row.account_currency_from = '';
            row.target_exchange_rate = 1;
        });
        frm.refresh_field('cheque_table');
    }
    
    // Update Cheque Table Pay
    if (frm.fields_dict.cheque_table_2) {
        frm.doc.cheque_table_2.forEach(row => {
            row.party_type = party_type_value;
            row.party = '';
            row.party_name = '';
            row.account_paid_to = '';
            row.account_currency = '';
            row.target_exchange_rate = 1;
        });
        frm.refresh_field('cheque_table_2');
    }
});
frappe.ui.form.on('Multiple Cheque Entry', 'party', function(frm) {
    if (cur_frm.doc.party_type == "Customer") {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Customer",
                fieldname: "customer_name",
                filters: { 'name': cur_frm.doc.party }
            },
            callback: function(r) {
                cur_frm.set_value("party_name", r.message.customer_name);
            }
        });
    }
    if (cur_frm.doc.party_type == "Supplier") {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Supplier",
                fieldname: "supplier_name",
                filters: { 'name': cur_frm.doc.party }
            },
            callback: function(r) {
                cur_frm.set_value("party_name", r.message.supplier_name);
            }
        });
    }
    
    // Update issuer_name in child tables
    if (frm.doc.party_name) {
        // Update Cheque Table Receive
        if (frm.fields_dict.cheque_table) {
            frm.doc.cheque_table.forEach(row => {
                row.issuer_name = frm.doc.party_name;
            });
            frm.refresh_field('cheque_table');
        }
        
        // Update Cheque Table Pay
        if (frm.fields_dict.cheque_table_2) {
            frm.doc.cheque_table_2.forEach(row => {
                row.issuer_name = frm.doc.party_name;
            });
            frm.refresh_field('cheque_table_2');
        }
    }
});
frappe.ui.form.on('Multiple Cheque Entry', 'party_type', function(frm) {
    if (cur_frm.doc.payment_type == "Receive" && cur_frm.doc.party_type == "Customer") {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Company",
                fieldname: "default_receivable_account",
                filters: { 'name': cur_frm.doc.company }
            },
            callback: function(r) {
                cur_frm.set_value("paid_from", r.message.default_receivable_account);
            }
        });
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Company",
                fieldname: "default_incoming_cheque_wallet_account",
                filters: { 'name': cur_frm.doc.company }
            },
            callback: function(r) {
                cur_frm.set_value("paid_to", r.message.default_incoming_cheque_wallet_account);
            }
        });
    }
    if (cur_frm.doc.payment_type == "Receive" && cur_frm.doc.party_type == "Supplier") {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Company",
                fieldname: "default_payable_account",
                filters: { 'name': cur_frm.doc.company }
            },
            callback: function(r) {
                cur_frm.set_value("paid_from", r.message.default_payable_account);
            }
        });
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Company",
                fieldname: "default_incoming_cheque_wallet_account",
                filters: { 'name': cur_frm.doc.company }
            },
            callback: function(r) {
                cur_frm.set_value("paid_to", r.message.default_incoming_cheque_wallet_account);
            }
        });
    }
    if (cur_frm.doc.payment_type == "Pay" && cur_frm.doc.party_type == "Customer") {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Company",
                fieldname: "default_receivable_account",
                filters: { 'name': cur_frm.doc.company }
            },
            callback: function(r) {
                cur_frm.set_value("paid_to", r.message.default_receivable_account);
            }
        });
    }
    if (cur_frm.doc.payment_type == "Pay" && cur_frm.doc.party_type == "Supplier") {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Company",
                fieldname: "default_payable_account",
                filters: { 'name': cur_frm.doc.company }
            },
            callback: function(r) {
                cur_frm.set_value("paid_to", r.message.default_payable_account);
            }
        });
    }
});
// Validation
frappe.ui.form.on("Multiple Cheque Entry", "validate", function(frm) {
  // قم بتعطيل هذه الأسطر بوضع // قبلها
// if (frm.doc.mode_of_payment_type != "Cheque") {
//     frappe.throw("The Type Of The Selected Mode Of Payment Is Not Cheque...");
// }
    
    // Validate child table data
    const isPay = frm.doc.payment_type === "Pay";
    const isReceive = frm.doc.payment_type === "Receive";
    const table = isPay ? frm.doc.cheque_table_2 : frm.doc.cheque_table;
    
    if (!table || !table.length) {
        frappe.throw("Please add cheque entries before submitting.");
    }
    
    table.forEach(row => {
        if (!row.party_type) {
            frappe.throw(`Party Type is required in row ${row.idx}`);
        }
        if (!row.party) {
            frappe.throw(`Party is required in row ${row.idx}`);
        }
        if (!row.account_paid_from) {
            frappe.throw(`Account Paid From is required in row ${row.idx}`);
        }
        if (!row.account_currency_from) {
            frappe.throw(`Account Currency (From) is required in row ${row.idx}`);
        }
        if (!row.account_paid_to) {
            frappe.throw(`Account Paid To is required in row ${row.idx}`);
        }
        if (!row.account_currency) {
            frappe.throw(`Account Currency (To) is required in row ${row.idx}`);
        }
        if (!row.paid_amount || row.paid_amount <= 0) {
            frappe.throw(`Paid Amount is required and must be greater than zero in row ${row.idx}`);
        }
        if (row.account_currency !== row.account_currency_from && (!row.target_exchange_rate || row.target_exchange_rate <= 0)) {
            frappe.throw(`Exchange Rate is required and must be greater than zero in row ${row.idx} (currencies differ: ${row.account_currency} ≠ ${row.account_currency_from}). Please create a Currency Exchange record.`);
        }
    });
});
// Helper function to update target exchange rate (only if not manually overridden)
function update_target_exchange_rate(frm, row, table_name, force) {
    if (!row.account_currency_from || !row.account_currency) {
        return;
    }
    // Skip auto-fetch if user has manually set the rate (unless forced)
    if (!force && row._rate_manually_set) {
        update_amount_in_company_currency(frm, row, table_name);
        return;
    }

    if (row.account_currency_from === row.account_currency) {
        frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", 1);
        update_amount_in_company_currency(frm, row, table_name);
        return;
    }

    const posting_date = frm.doc.posting_date || frappe.datetime.nowdate();

    if (table_name === 'cheque_table') {
        // For Receive: get exchange rate from cheque currency (account_currency) to party account currency (account_currency_from)
        get_exchange_rate(row.account_currency, row.account_currency_from, posting_date)
            .then(rate => {
                if (!rate) {
                    frappe.msgprint({
                        title: __('Exchange Rate Not Found'),
                        indicator: 'red',
                        message: __('No Currency Exchange record found for {0} → {1} on or before {2}. Please create one before proceeding.',
                            [row.account_currency, row.account_currency_from, posting_date])
                    });
                    frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", 0);
                    frm.refresh_field(table_name);
                    return;
                }
                frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", rate);
                // Update cheque_currency to match account_currency (bank/to account)
                if (!row.cheque_currency) {
                    frappe.model.set_value(row.doctype, row.name, "cheque_currency", row.account_currency);
                }
                update_amount_in_company_currency(frm, locals[row.doctype][row.name], table_name);
                frm.refresh_field(table_name);
            });
    } else {
        // For Pay: get exchange rate from cheque currency (account_currency_from) to party account currency (account_currency)
        get_exchange_rate(row.account_currency_from, row.account_currency, posting_date)
            .then(rate => {
                if (!rate) {
                    frappe.msgprint({
                        title: __('Exchange Rate Not Found'),
                        indicator: 'red',
                        message: __('No Currency Exchange record found for {0} → {1} on or before {2}. Please create one before proceeding.',
                            [row.account_currency_from, row.account_currency, posting_date])
                    });
                    frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", 0);
                    frm.refresh_field(table_name);
                    return;
                }
                frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", rate);
                // Update cheque_currency to match account_currency_from (bank/from account)
                if (!row.cheque_currency) {
                    frappe.model.set_value(row.doctype, row.name, "cheque_currency", row.account_currency_from);
                }
                update_amount_in_company_currency(frm, locals[row.doctype][row.name], table_name);
                frm.refresh_field(table_name);
            });
    }
}

// Helper to calculate and set amount_in_company_currency
function update_amount_in_company_currency(frm, row, table_name) {
    const amount = flt(row.paid_amount);
    const rate = flt(row.target_exchange_rate);
    const amt_company_currency = amount * (rate || 1);
    frappe.model.set_value(row.doctype, row.name, "amount_in_company_currency", amt_company_currency);
    frm.refresh_field(table_name);
}

// Add Excel upload/download buttons to the form
function add_excel_buttons(frm) {
    const isPay = frm.doc.payment_type === "Pay";
    const table_field = isPay ? "cheque_table_2" : "cheque_table";
    const payment_type = frm.doc.payment_type;

    if (!frm.fields_dict[table_field]) return;

    // Download Template button
    const download_btn_id = "btn-download-template-" + table_field;
    if (!frm.fields_dict[table_field].wrapper.querySelector("#" + download_btn_id)) {
        const $wrapper = $(frm.fields_dict[table_field].wrapper);
        const $btn_group = $wrapper.find(".grid-heading-row .grid-buttons");

        const $download_btn = $(`<button id="${download_btn_id}" class="btn btn-xs btn-default" style="margin-left:5px;">
            <i class="fa fa-download"></i> ${__("Download Template")}
        </button>`);

        $download_btn.on("click", function() {
            window.location.href = frappe.urllib.get_full_url(
                "/api/method/ecs_cheques.ecs_cheques.doctype.multiple_cheque_entry.multiple_cheque_entry.get_cheques_excel_template"
                + "?payment_type=" + encodeURIComponent(payment_type)
            );
        });

        const $upload_btn = $(`<button id="btn-upload-excel-${table_field}" class="btn btn-xs btn-default" style="margin-left:5px;">
            <i class="fa fa-upload"></i> ${__("Upload Excel")}
        </button>`);

        $upload_btn.on("click", function() {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".xlsx";
            input.onchange = function() {
                const file = input.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result.split(",")[1];
                    frappe.call({
                        method: "ecs_cheques.ecs_cheques.doctype.multiple_cheque_entry.multiple_cheque_entry.upload_cheques_excel",
                        args: { file_data: base64, payment_type: payment_type },
                        callback: function(r) {
                            if (r.message && r.message.length) {
                                r.message.forEach(function(row_data) {
                                    const child_doctype = isPay ? "Cheque Table Pay" : "Cheque Table Receive";
                                    const new_row = frappe.model.add_child(frm.doc, child_doctype, table_field);
                                    Object.keys(row_data).forEach(function(key) {
                                        if (row_data[key] !== null && row_data[key] !== undefined) {
                                            frappe.model.set_value(new_row.doctype, new_row.name, key, row_data[key]);
                                        }
                                    });
                                });
                                frm.refresh_field(table_field);
                                frappe.msgprint(__("تم رفع {0} شيك بنجاح", [r.message.length]));
                            }
                        }
                    });
                };
                reader.readAsDataURL(file);
            };
            input.click();
        });

        if ($btn_group.length) {
            $btn_group.append($download_btn).append($upload_btn);
        }
    }
}
// Unified Submit Handler
frappe.ui.form.on("Multiple Cheque Entry", "on_submit", function(frm) {
    const isPay = frm.doc.payment_type === "Pay";
    const isReceive = frm.doc.payment_type === "Receive";
    const table = isPay ? frm.doc.cheque_table_2 : frm.doc.cheque_table;
    
    if (!table || !table.length) return;
    
    let docs = [];
    let promises = [];
    
    // Process each row
    table.forEach((row, index) => {
        if (!row.payment_entry) {
            const paid_from_account = row.account_paid_from;
            const paid_to_account = row.account_paid_to;
            const from_currency = row.account_currency_from;
            const to_currency = row.account_currency;
            const exchange_rate = flt(row.target_exchange_rate) || 1;

            // Prevent creating PE with 0 exchange rate when currencies differ
            if (from_currency !== to_currency && (!row.target_exchange_rate || row.target_exchange_rate <= 0)) {
                frappe.msgprint({
                    title: __('Missing Exchange Rate'),
                    indicator: 'red',
                    message: __('Row {0}: Cannot create Payment Entry — Exchange Rate is missing or zero for {1} → {2}. Please add a Currency Exchange record and retry.',
                        [row.idx, isReceive ? to_currency : from_currency, isReceive ? from_currency : to_currency])
                });
                return;
            }

            // ERPNext v15 exchange rate conventions:
            //   source_exchange_rate = rate of paid_from_account_currency → company currency
            //   target_exchange_rate = rate of paid_to_account_currency → company currency
            //
            // Receive: paid_from = party account (EGP), paid_to = cheque wallet (USD)
            //   → source_exchange_rate = 1 (party EGP = company EGP)
            //   → target_exchange_rate = row.target_exchange_rate (cheque USD → EGP)
            //
            // Pay: paid_from = bank/cheque account (USD), paid_to = party account (EGP)
            //   → source_exchange_rate = row.target_exchange_rate (cheque USD → EGP)
            //   → target_exchange_rate = 1 (party EGP = company EGP)
            let source_exchange_rate, target_exchange_rate_pe;
            if (from_currency === to_currency) {
                // Same currency on both sides: all rates = 1
                source_exchange_rate = 1;
                target_exchange_rate_pe = 1;
            } else if (isReceive) {
                // Receive: paid_from = party account (company currency, rate=1)
                //          paid_to  = cheque wallet (foreign currency, rate=exchange_rate)
                source_exchange_rate = 1;
                target_exchange_rate_pe = exchange_rate;
            } else {
                // Pay: paid_from = cheque account (foreign currency, rate=exchange_rate)
                //      paid_to  = party account (company currency, rate=1)
                source_exchange_rate = exchange_rate;
                target_exchange_rate_pe = 1;
            }

            // Create the doc
            const doc = {
                doctype: "Payment Entry",
                posting_date: frm.doc.posting_date,
                reference_doctype: "Multiple Cheque Entry",
                reference_link: frm.doc.name,
                payment_type: frm.doc.payment_type,
                mode_of_payment: row.mode_of_payment || frm.doc.mode_of_payment,
                mode_of_payment_type: row.mode_of_payment_type || frm.doc.mode_of_payment_type,
                party_type: row.party_type,
                party: row.party,
                paid_from: paid_from_account,
                paid_to: paid_to_account,
                paid_from_account_currency: from_currency,
                paid_to_account_currency: to_currency,
                source_exchange_rate: source_exchange_rate,
                target_exchange_rate: target_exchange_rate_pe,
                cheque_bank: row.cheque_bank || frm.doc.cheque_bank,
                bank_acc: row.bank_acc || frm.doc.bank_acc,
                cheque_type: row.cheque_type,
                reference_no: row.reference_no,
                reference_date: row.reference_date,
                first_beneficiary: row.first_beneficiary,
                person_name: row.person_name,
                issuer_name: row.issuer_name,
                picture_of_check: row.picture_of_check,
                cheque_table_no: isReceive ? row.name : undefined,
                cheque_table_no2: isPay ? row.name : undefined
            };
            
            // Add drawn_bank for Receive type
            if (isReceive) {
                doc.drawn_bank = row.bank;
            }
            
            // Set amounts based on payment type and currencies
            if (isReceive) {
                // Receive: paid_to = cheque wallet (bank currency), paid_from = party account
                // received_amount is in paid_to currency, paid_amount is in paid_from currency
                doc.received_amount = row.paid_amount; // Amount in cheque/bank currency (paid_to)
                doc.paid_amount = row.paid_amount * exchange_rate; // Amount in party currency (paid_from)
            } else {
                // Pay: paid_from = bank/cheque account, paid_to = party account
                // paid_amount is in paid_from currency, received_amount is in paid_to currency
                doc.paid_amount = row.paid_amount; // Amount in cheque/bank currency (paid_from)
                doc.received_amount = row.paid_amount * exchange_rate; // Amount in party currency (paid_to)
            }
            
            // Create the payment entry
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
                                    if (submitted.message) {
                                        const child_doctype = isPay ? "Cheque Table Pay" : "Cheque Table Receive";
                                        frappe.db.set_value(child_doctype, row.name, "payment_entry", submitted.message.name)
                                            .then(() => resolve());
                                    }
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
            frappe.msgprint("تم إنشاء الشيكات بنجاح ... برجاء الدخول على المدفوعات والمقبوضات ");
            frm.reload_doc();
        });
    }
});
// Child Table Auto-fill Handlers
frappe.ui.form.on("Cheque Table Pay", "first_beneficiary", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    row.person_name = frm.doc.party_name;
    row.issuer_name = frm.doc.company;
    frm.refresh_field("cheque_table_2");
});
frappe.ui.form.on("Cheque Table Receive", "first_beneficiary", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    row.person_name = frm.doc.company;
    row.issuer_name = frm.doc.party_name;
    frm.refresh_field("cheque_table");
});
// Child Table Account Currency Auto-fill (To)
frappe.ui.form.on("Cheque Table Receive", "account_paid_to", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (row.account_paid_to) {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Account",
                fieldname: "account_currency",
                filters: { name: row.account_paid_to }
            },
            callback: function(r) {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "account_currency", r.message.account_currency);
                    // Set cheque_currency to bank account currency (cheque is denominated in bank currency)
                    frappe.model.set_value(cdt, cdn, "cheque_currency", r.message.account_currency);
                    // Reset manual flag on fresh row reference inside callback
                    locals[cdt][cdn]._rate_manually_set = false;
                    // Update target exchange rate
                    update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table');
                    frm.refresh_field("cheque_table");
                }
            }
        });
    }
});
frappe.ui.form.on("Cheque Table Pay", "account_paid_to", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (row.account_paid_to) {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Account",
                fieldname: "account_currency",
                filters: { name: row.account_paid_to }
            },
            callback: function(r) {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "account_currency", r.message.account_currency);
                    // Update target exchange rate
                    update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table_2');
                    frm.refresh_field("cheque_table_2");
                }
            }
        });
    }
});
// Child Table Account Currency Auto-fill (From)
frappe.ui.form.on("Cheque Table Receive", "account_paid_from", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (row.account_paid_from) {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Account",
                fieldname: "account_currency",
                filters: { name: row.account_paid_from }
            },
            callback: function(r) {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "account_currency_from", r.message.account_currency);
                    // Update target exchange rate
                    update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table');
                    frm.refresh_field("cheque_table");
                }
            }
        });
    }
});
frappe.ui.form.on("Cheque Table Pay", "account_paid_from", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (row.account_paid_from) {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Account",
                fieldname: "account_currency",
                filters: { name: row.account_paid_from }
            },
            callback: function(r) {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "account_currency_from", r.message.account_currency);
                    // For Pay: cheque currency = bank account (from) currency
                    frappe.model.set_value(cdt, cdn, "cheque_currency", r.message.account_currency);
                    // Reset manual flag on fresh row reference inside callback
                    locals[cdt][cdn]._rate_manually_set = false;
                    // Update target exchange rate
                    update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table_2');
                    frm.refresh_field("cheque_table_2");
                }
            }
        });
    }
});
// Child Table Party Type Change Handler
frappe.ui.form.on("Cheque Table Receive", "party_type", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    frappe.model.set_value(cdt, cdn, "party", "");
    frappe.model.set_value(cdt, cdn, "party_name", "");
    frappe.model.set_value(cdt, cdn, "account_paid_from", "");
    frappe.model.set_value(cdt, cdn, "account_currency_from", "");
    frappe.model.set_value(cdt, cdn, "target_exchange_rate", 1);
    frm.refresh_field("cheque_table");
});
frappe.ui.form.on("Cheque Table Pay", "party_type", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    frappe.model.set_value(cdt, cdn, "party", "");
    frappe.model.set_value(cdt, cdn, "party_name", "");
    frappe.model.set_value(cdt, cdn, "account_paid_to", "");
    frappe.model.set_value(cdt, cdn, "account_currency", "");
    frappe.model.set_value(cdt, cdn, "target_exchange_rate", 1);
    frm.refresh_field("cheque_table_2");
});
// Child Table Party Change Handler
frappe.ui.form.on("Cheque Table Receive", "party", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (row.party && row.party_type) {
        // Get party name
        const fieldname = row.party_type === "Customer" ? "customer_name" : "supplier_name";
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: row.party_type,
                fieldname: fieldname,
                filters: { name: row.party }
            },
            callback: function(r) {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "party_name", r.message[fieldname]);
                    frappe.model.set_value(cdt, cdn, "issuer_name", r.message[fieldname]);
                    frm.refresh_field("cheque_table");
                }
            }
        });
        
        // Get company's default account based on party type
        if (row.party_type === "Customer") {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Company",
                    fieldname: "default_receivable_account",
                    filters: { name: frm.doc.company }
                },
                callback: function(r) {
                    if (r.message && r.message.default_receivable_account) {
                        frappe.model.set_value(cdt, cdn, "account_paid_from", r.message.default_receivable_account);
                        
                        // Get account currency
                        frappe.call({
                            method: "frappe.client.get_value",
                            args: {
                                doctype: "Account",
                                fieldname: "account_currency",
                                filters: { name: r.message.default_receivable_account }
                            },
                            callback: function(r2) {
                                if (r2.message) {
                                    frappe.model.set_value(cdt, cdn, "account_currency_from", r2.message.account_currency);
                                    // Update target exchange rate
                                    update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table');
                                    frm.refresh_field("cheque_table");
                                }
                            }
                        });
                    }
                }
            });
        } else if (row.party_type === "Supplier") {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Company",
                    fieldname: "default_payable_account",
                    filters: { name: frm.doc.company }
                },
                callback: function(r) {
                    if (r.message && r.message.default_payable_account) {
                        frappe.model.set_value(cdt, cdn, "account_paid_from", r.message.default_payable_account);
                        
                        // Get account currency
                        frappe.call({
                            method: "frappe.client.get_value",
                            args: {
                                doctype: "Account",
                                fieldname: "account_currency",
                                filters: { name: r.message.default_payable_account }
                            },
                            callback: function(r2) {
                                if (r2.message) {
                                    frappe.model.set_value(cdt, cdn, "account_currency_from", r2.message.account_currency);
                                    // Update target exchange rate
                                    update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table');
                                    frm.refresh_field("cheque_table");
                                }
                            }
                        });
                    }
                }
            });
        }
        
        // Set account_paid_to to parent's bank_acc
        if (frm.doc.bank_acc) {
            frappe.model.set_value(cdt, cdn, "account_paid_to", frm.doc.bank_acc);
            
            // Get account currency
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Account",
                    fieldname: "account_currency",
                    filters: { name: frm.doc.bank_acc }
                },
                callback: function(r) {
                    if (r.message) {
                        frappe.model.set_value(cdt, cdn, "account_currency", r.message.account_currency);
                        frappe.model.set_value(cdt, cdn, "cheque_currency", r.message.account_currency);
                        // Update target exchange rate
                        update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table');
                        frm.refresh_field("cheque_table");
                    }
                }
            });
        }
    }
});
frappe.ui.form.on("Cheque Table Pay", "party", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (row.party && row.party_type) {
        // Get party name
        const fieldname = row.party_type === "Customer" ? "customer_name" : "supplier_name";
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: row.party_type,
                fieldname: fieldname,
                filters: { name: row.party }
            },
            callback: function(r) {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "party_name", r.message[fieldname]);
                    frappe.model.set_value(cdt, cdn, "issuer_name", r.message[fieldname]);
                    frm.refresh_field("cheque_table_2");
                }
            }
        });
        
        // Get company's default account based on party type
        if (row.party_type === "Supplier") {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Company",
                    fieldname: "default_payable_account",
                    filters: { name: frm.doc.company }
                },
                callback: function(r) {
                    if (r.message && r.message.default_payable_account) {
                        frappe.model.set_value(cdt, cdn, "account_paid_to", r.message.default_payable_account);
                        
                        // Get account currency
                        frappe.call({
                            method: "frappe.client.get_value",
                            args: {
                                doctype: "Account",
                                fieldname: "account_currency",
                                filters: { name: r.message.default_payable_account }
                            },
                            callback: function(r2) {
                                if (r2.message) {
                                    frappe.model.set_value(cdt, cdn, "account_currency", r2.message.account_currency);
                                    // Update target exchange rate
                                    update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table_2');
                                    frm.refresh_field("cheque_table_2");
                                }
                            }
                        });
                    }
                }
            });
        } else if (row.party_type === "Customer") {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Company",
                    fieldname: "default_receivable_account",
                    filters: { name: frm.doc.company }
                },
                callback: function(r) {
                    if (r.message && r.message.default_receivable_account) {
                        frappe.model.set_value(cdt, cdn, "account_paid_to", r.message.default_receivable_account);
                        
                        // Get account currency
                        frappe.call({
                            method: "frappe.client.get_value",
                            args: {
                                doctype: "Account",
                                fieldname: "account_currency",
                                filters: { name: r.message.default_receivable_account }
                            },
                            callback: function(r2) {
                                if (r2.message) {
                                    frappe.model.set_value(cdt, cdn, "account_currency", r2.message.account_currency);
                                    // Update target exchange rate
                                    update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table_2');
                                    frm.refresh_field("cheque_table_2");
                                }
                            }
                        });
                    }
                }
            });
        }
        
        // Set account_paid_from to parent's bank_acc
        if (frm.doc.bank_acc) {
            frappe.model.set_value(cdt, cdn, "account_paid_from", frm.doc.bank_acc);
            
            // Get account currency
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Account",
                    fieldname: "account_currency",
                    filters: { name: frm.doc.bank_acc }
                },
                callback: function(r) {
                    if (r.message) {
                        frappe.model.set_value(cdt, cdn, "account_currency_from", r.message.account_currency);
                        frappe.model.set_value(cdt, cdn, "cheque_currency", r.message.account_currency);
                        // Update target exchange rate
                        update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table_2');
                        frm.refresh_field("cheque_table_2");
                    }
                }
            });
        }
    }
});
// Child Table Mode of Payment Change Handler
frappe.ui.form.on("Cheque Table Receive", "mode_of_payment", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (row.mode_of_payment) {
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Mode of Payment",
                name: row.mode_of_payment
            },
            callback: function(r) {
                if (r.message && r.message.accounts && r.message.accounts.length > 0) {
                    const default_account = r.message.accounts[0].default_account;
                    frappe.model.set_value(cdt, cdn, "account_paid_to", default_account);
                    
                    // Get account currency
                    frappe.call({
                        method: "frappe.client.get_value",
                        args: {
                            doctype: "Account",
                            fieldname: "account_currency",
                            filters: { name: default_account }
                        },
                        callback: function(r2) {
                            if (r2.message) {
                                frappe.model.set_value(cdt, cdn, "account_currency", r2.message.account_currency);
                                frappe.model.set_value(cdt, cdn, "cheque_currency", r2.message.account_currency);
                                // Update target exchange rate
                                update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table');
                                frm.refresh_field("cheque_table");
                            }
                        }
                    });
                }
            }
        });
    }
});
frappe.ui.form.on("Cheque Table Pay", "mode_of_payment", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (row.mode_of_payment) {
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Mode of Payment",
                name: row.mode_of_payment
            },
            callback: function(r) {
                if (r.message && r.message.accounts && r.message.accounts.length > 0) {
                    const default_account = r.message.accounts[0].default_account;
                    frappe.model.set_value(cdt, cdn, "account_paid_from", default_account);
                    
                    // Get account currency
                    frappe.call({
                        method: "frappe.client.get_value",
                        args: {
                            doctype: "Account",
                            fieldname: "account_currency",
                            filters: { name: default_account }
                        },
                        callback: function(r2) {
                            if (r2.message) {
                                frappe.model.set_value(cdt, cdn, "account_currency_from", r2.message.account_currency);
                                frappe.model.set_value(cdt, cdn, "cheque_currency", r2.message.account_currency);
                                // Update target exchange rate
                                update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table_2');
                                frm.refresh_field("cheque_table_2");
                            }
                        }
                    });
                }
            }
        });
    }
});
// Child Table Row Add Handler
frappe.ui.form.on("Cheque Table Receive", "cheque_table_add", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    // Set default values
    row.party_type = frm.doc.party_type;
    row.issuer_name = frm.doc.party_name;
    row.mode_of_payment = frm.doc.mode_of_payment;
    row.target_exchange_rate = 1;
    frm.refresh_field("cheque_table");
    
    // If mode_of_payment is set, fetch default account
    if (row.mode_of_payment) {
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Mode of Payment",
                name: row.mode_of_payment
            },
            callback: function(r) {
                if (r.message && r.message.accounts && r.message.accounts.length > 0) {
                    const default_account = r.message.accounts[0].default_account;
                    frappe.model.set_value(cdt, cdn, "account_paid_to", default_account);
                    
                    // Get account currency
                    frappe.call({
                        method: "frappe.client.get_value",
                        args: {
                            doctype: "Account",
                            fieldname: "account_currency",
                            filters: { name: default_account }
                        },
                        callback: function(r2) {
                            if (r2.message) {
                                frappe.model.set_value(cdt, cdn, "account_currency", r2.message.account_currency);
                                frappe.model.set_value(cdt, cdn, "cheque_currency", r2.message.account_currency);
                                // Update target exchange rate
                                update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table');
                                frm.refresh_field("cheque_table");
                            }
                        }
                    });
                }
            }
        });
    }
});
frappe.ui.form.on("Cheque Table Pay", "cheque_table_2_add", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    // Set default values
    row.party_type = frm.doc.party_type;
    row.issuer_name = frm.doc.party_name;
    row.mode_of_payment = frm.doc.mode_of_payment;
    row.target_exchange_rate = 1;
    frm.refresh_field("cheque_table_2");
    
    // If mode_of_payment is set, fetch default account
    if (row.mode_of_payment) {
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Mode of Payment",
                name: row.mode_of_payment
            },
            callback: function(r) {
                if (r.message && r.message.accounts && r.message.accounts.length > 0) {
                    const default_account = r.message.accounts[0].default_account;
                    frappe.model.set_value(cdt, cdn, "account_paid_from", default_account);
                    
                    // Get account currency
                    frappe.call({
                        method: "frappe.client.get_value",
                        args: {
                            doctype: "Account",
                            fieldname: "account_currency",
                            filters: { name: default_account }
                        },
                        callback: function(r2) {
                            if (r2.message) {
                                frappe.model.set_value(cdt, cdn, "account_currency_from", r2.message.account_currency);
                                frappe.model.set_value(cdt, cdn, "cheque_currency", r2.message.account_currency);
                                // Update target exchange rate
                                update_target_exchange_rate(frm, locals[cdt][cdn], 'cheque_table_2');
                                frm.refresh_field("cheque_table_2");
                            }
                        }
                    });
                }
            }
        });
    }
});

// --- paid_amount change: recalculate amount_in_company_currency ---
frappe.ui.form.on("Cheque Table Receive", "paid_amount", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    update_amount_in_company_currency(frm, row, 'cheque_table');
});
frappe.ui.form.on("Cheque Table Pay", "paid_amount", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    update_amount_in_company_currency(frm, row, 'cheque_table_2');
});

// --- target_exchange_rate change: mark as manually set and recalculate ---
frappe.ui.form.on("Cheque Table Receive", "target_exchange_rate", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    row._rate_manually_set = true;
    update_amount_in_company_currency(frm, row, 'cheque_table');
});
frappe.ui.form.on("Cheque Table Pay", "target_exchange_rate", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    row._rate_manually_set = true;
    update_amount_in_company_currency(frm, row, 'cheque_table_2');
});

// --- cheque_currency change: update account currency and refresh exchange rate ---
frappe.ui.form.on("Cheque Table Receive", "cheque_currency", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    row._rate_manually_set = false;
    if (row.cheque_currency) {
        frappe.model.set_value(cdt, cdn, "account_currency", row.cheque_currency);
        update_target_exchange_rate(frm, row, 'cheque_table', true);
    }
});
frappe.ui.form.on("Cheque Table Pay", "cheque_currency", function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    row._rate_manually_set = false;
    if (row.cheque_currency) {
        frappe.model.set_value(cdt, cdn, "account_currency_from", row.cheque_currency);
        update_target_exchange_rate(frm, row, 'cheque_table_2', true);
    }
});

// --- posting_date change: refresh exchange rates for all rows that were not manually set ---
frappe.ui.form.on("Multiple Cheque Entry", "posting_date", function(frm) {
    if (frm.fields_dict.cheque_table) {
        frm.doc.cheque_table.forEach(row => {
            if (!row._rate_manually_set) {
                update_target_exchange_rate(frm, row, 'cheque_table', false);
            }
        });
    }
    if (frm.fields_dict.cheque_table_2) {
        frm.doc.cheque_table_2.forEach(row => {
            if (!row._rate_manually_set) {
                update_target_exchange_rate(frm, row, 'cheque_table_2', false);
            }
        });
    }
});

