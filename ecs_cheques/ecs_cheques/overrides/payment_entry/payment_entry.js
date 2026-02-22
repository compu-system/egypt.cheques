frappe.ui.form.on("Payment Entry", {
    before_save(frm) {
        // Capture cheque_action value before saving so we can detect a change in after_save
        frm.__cheque_action_before_save = frm.doc.cheque_action;
    },

    after_save(frm) {
        const old_action = frm.__cheque_action_before_save;
        const new_action = frm.doc.cheque_action;
        // Reset so subsequent no-change saves don't re-trigger
        frm.__cheque_action_before_save = new_action;

        // Only show message when cheque_action actually changed to a non-empty value
        if (old_action !== undefined && new_action && old_action !== new_action) {
            frappe.db.get_list("Journal Entry", {
                filters: {
                    reference_doctype: "Payment Entry",
                    reference_link: frm.doc.name
                },
                fields: ["name"],
                order_by: "modified desc",
                limit: 1
            }).then(list => {
                let msg = `تم إنشاء قيد يومية: <b>${new_action}</b>`;
                if (list && list.length > 0) {
                    const je_name = list[0].name;
                    msg += `<br><a href="/app/journal-entry/${je_name}">${je_name}</a>`;
                }
                frappe.msgprint({
                    title: __("قيد يومية"),
                    indicator: "green",
                    message: msg
                });
            });
        }
    },

    refresh(frm) {
        // Exchange rate hint: when reference_no and target_exchange_rate are set,
        // show a visual indicator: Exchange Rate: 1 ILS = (1 / target_exchange_rate) USD
        if (frm.doc.reference_no && frm.doc.target_exchange_rate && frm.doc.target_exchange_rate !== 1) {
            const rate = (1 / frm.doc.target_exchange_rate).toFixed(5);
            frm.dashboard.add_comment(
                __("Exchange Rate: 1 {0} = {1} {2}", [
                    frm.doc.paid_from_account_currency || "ILS",
                    rate,
                    frm.doc.paid_to_account_currency || "USD"
                ]),
                "blue",
                true
            );
        }

        // 1. حالة الشيك في حافظة الوارد - شيك مفتوح
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && frm.doc.payment_type == "Receive" && frm.doc.cheque_type == "Opened" && frm.doc.cheque_status == "حافظة شيكات واردة"){
            set_field_options("cheque_action", ["رد شيك","تحويل إلى حافظة شيكات أخرى","تظهير شيك","إيداع شيك تحت التحصيل","تحصيل فوري للشيك"]);
        }
        
        // 2. حالة الشيك في حافظة الوارد - شيك غير مفتوح
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && frm.doc.payment_type == "Receive" && frm.doc.cheque_type != "Opened" && frm.doc.cheque_status == "حافظة شيكات واردة"){
            set_field_options("cheque_action", ["تحويل إلى حافظة شيكات أخرى","إيداع شيك تحت التحصيل","تحصيل فوري للشيك"]);
        }
        
        // 3. التعديل المطلوب: حالة الشيك تحت التحصيل (إضافة سحب الشيك)
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && frm.doc.payment_type == "Receive" && frm.doc.cheque_status == "تحت التحصيل"){
            // أضفت هنا "سحب شيك من التحصيل" بدلاً من الاعتماد على الرفض فقط
            set_field_options("cheque_action", ["سحب شيك من التحصيل", "رفض شيك تحت التحصيل", "صرف شيك تحت التحصيل"]);
        }
        
        // 4. حالة الشيك مرفوض بالبنك
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && frm.doc.payment_type == "Receive" && frm.doc.cheque_status == "مرفوض بالبنك"){
            set_field_options("cheque_action", ["إيداع شيك تحت التحصيل","رد شيك","إرجاع لحافظة شيكات واردة", "تظهير شيك"]);
        }

        // 5. حالة الشيك مرفوض مع اختلاف المبالغ
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && frm.doc.payment_type == "Receive" && frm.doc.paid_amount != frm.doc.encashed_amount && frm.doc.cheque_status == "مرفوض بالبنك"){
            set_field_options("cheque_action", ["رد شيك","إرجاع لحافظة شيكات واردة","إيداع شيك تحت التحصيل","تسييل الشيك"]);
        }

        // 6. حالة حافظة شيكات مرجعة
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && frm.doc.payment_type == "Receive" && frm.doc.cheque_status == "حافظة شيكات مرجعة"){
                set_field_options("cheque_action", ["إيداع شيك تحت التحصيل","رد شيك","تسييل الشيك"]);
        }

        // 7. شيك مرجع مع مبالغ متبقية
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && frm.doc.payment_type == "Receive" && frm.doc.paid_amount > frm.doc.encashed_amount && frm.doc.cheque_status == "حافظة شيكات مرجعة"){
                set_field_options("cheque_action", ["رد شيك","تسييل الشيك"]);
        }

        // 8. تسييل الشيك
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && frm.doc.payment_type == "Receive" && frm.doc.paid_amount > frm.doc.encashed_amount && frm.doc.encashed_amount != 0){
                set_field_options("cheque_action", ["تسييل الشيك"]);
        }

        // 9. رد شيك نهائي
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && frm.doc.payment_type == "Receive" && frm.doc.paid_amount == frm.doc.encashed_amount && frm.doc.cheque_status == "حافظة شيكات مرجعة"){
                set_field_options("cheque_action", ["رد شيك"]);
        }

        // 10. شيكات برسم الدفع (صرف أو سحب)
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && (frm.doc.payment_type == "Pay" || frm.doc.payment_type == "Internal Transfer") && frm.doc.cheque_status_pay == "حافظة شيكات برسم الدفع"){
            set_field_options("cheque_action", ["صرف الشيك","سحب الشيك"]);
        }

        // 11. الحالات المنتهية (إخفاء الخيارات)
        if (frm.doc.docstatus == "1" && frm.doc.mode_of_payment_type == "Cheque" && (frm.doc.cheque_status == "مظهر" || frm.doc.cheque_status == "محصل فوري" || frm.doc.cheque_status == "مردود" || frm.doc.cheque_status == "محصل" || frm.doc.cheque_status_pay == "مدفوع" || frm.doc.cheque_status_pay == "مسحوب")){
            set_field_options("cheque_action", [" "]);
        }
    }
});