frappe.ui.form.on("Payment Entry", {
    refresh(frm) {
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