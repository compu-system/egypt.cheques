// Copyright (c) 2021, erpcloud.systems and contributors
// For license information, please see license.txt
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
        if (!row.target_exchange_rate || row.target_exchange_rate <= 0) {
            frappe.throw(`Target Exchange Rate is required and must be greater than zero in row ${row.idx}`);
        }
    });
});
// Helper function to update target exchange rate
function update_target_exchange_rate(frm, row, table_name) {
    if (!row.account_currency_from || !row.account_currency) {
        return;
    }
    
    if (row.account_currency_from === row.account_currency) {
        frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", 1);
        return;
    }
    
    const posting_date = frm.doc.posting_date || frappe.datetime.nowdate();
    
    if (table_name === 'cheque_table') {
        // For Receive: get exchange rate from account_paid_to currency to account_currency_from
        get_exchange_rate(row.account_currency, row.account_currency_from, posting_date)
            .then(rate => {
                frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", rate);
                frm.refresh_field(table_name);
            });
    } else {
        // For Pay: get exchange rate from account_paid_from currency to account_currency
        get_exchange_rate(row.account_currency_from, row.account_currency, posting_date)
            .then(rate => {
                frappe.model.set_value(row.doctype, row.name, "target_exchange_rate", rate);
                frm.refresh_field(table_name);
            });
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
            const exchange_rate = row.target_exchange_rate || 1;
            
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
                target_exchange_rate: exchange_rate,
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
                // For Receive: 
                // paid_amount (customer currency) = received_amount (bank currency) * exchange_rate
                doc.received_amount = row.paid_amount; // Amount in bank currency
                doc.paid_amount = row.paid_amount * exchange_rate; // Amount in customer currency
            } else {
                // For Pay:
                // received_amount (supplier currency) = paid_amount (bank currency) * exchange_rate
                doc.paid_amount = row.paid_amount; // Amount in bank currency
                doc.received_amount = row.paid_amount * exchange_rate; // Amount in supplier currency
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
                    // Update target exchange rate
                    update_target_exchange_rate(frm, row, 'cheque_table');
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
                    update_target_exchange_rate(frm, row, 'cheque_table_2');
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
                    update_target_exchange_rate(frm, row, 'cheque_table');
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
                    // Update target exchange rate
                    update_target_exchange_rate(frm, row, 'cheque_table_2');
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
                                    update_target_exchange_rate(frm, row, 'cheque_table');
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
                                    update_target_exchange_rate(frm, row, 'cheque_table');
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
                        // Update target exchange rate
                        update_target_exchange_rate(frm, row, 'cheque_table');
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
                                    update_target_exchange_rate(frm, row, 'cheque_table_2');
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
                                    update_target_exchange_rate(frm, row, 'cheque_table_2');
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
                        // Update target exchange rate
                        update_target_exchange_rate(frm, row, 'cheque_table_2');
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
                                // Update target exchange rate
                                update_target_exchange_rate(frm, row, 'cheque_table');
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
                                // Update target exchange rate
                                update_target_exchange_rate(frm, row, 'cheque_table_2');
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
                                // Update target exchange rate
                                update_target_exchange_rate(frm, row, 'cheque_table');
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
                                // Update target exchange rate
                                update_target_exchange_rate(frm, row, 'cheque_table_2');
                                frm.refresh_field("cheque_table_2");
                            }
                        }
                    });
                }
            }
        });
    }
});


