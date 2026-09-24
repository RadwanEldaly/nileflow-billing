import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wgtocngbhhpyieorzirt.supabase.co';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 جاري جلب البيانات...\n');

  // 1. جلب العملاء
  const { data: customers } = await supabase.from('customers').select('*');
  console.log(`العملاء الموجودون (${customers?.length || 0}):`);
  customers?.forEach(c => console.log(`  [${c.code}] ${c.name} | رصيد: ${c.balance}`));

  // 2. جلب المخازن
  const { data: warehouses } = await supabase.from('warehouses').select('*');
  console.log(`\nالمخازن (${warehouses?.length || 0}):`);
  warehouses?.forEach(w => console.log(`  ${w.name} | ID: ${w.id}`));

  // 3. جلب المنتجات
  const { data: allProducts } = await supabase.from('products').select('*');
  console.log(`\nالمنتجات (${allProducts?.length || 0}):`);
  allProducts?.forEach(p => console.log(`  [${p.code}] ${p.name} | ${p.size || ''} | ${p.color || ''}`));

  // ===== إيجاد العميل =====
  let customer = customers?.find(c => c.code === '130' || c.name?.includes('حسام'));

  if (!customer) {
    console.log('\n⚠️ العميل مش موجود، هضيفه...');
    const { data: newCust, error } = await supabase
      .from('customers')
      .insert([{ code: '130', name: 'حسام الدالي', mobile: '01001911745', address: 'حلوان', balance: 0 }])
      .select();
    if (error) { console.error('❌ خطأ في إضافة العميل:', error); process.exit(1); }
    customer = newCust[0];
    console.log(`✅ تم إضافة العميل: ${customer.name}`);
  } else {
    console.log(`\n✅ العميل موجود: ${customer.name} | رصيد حالي: ${customer.balance}`);
  }

  // ===== المخزن =====
  const warehouse = warehouses?.[0];
  if (!warehouse) { console.error('❌ مفيش مخازن!'); process.exit(1); }
  console.log(`✅ المخزن: ${warehouse.name}`);

  // ===== إيجاد المنتجات =====
  const prod1 = allProducts?.find(p =>
    p.name?.toLowerCase().includes('rast') || p.code?.includes('1001')
  );
  const prod2 = allProducts?.find(p =>
    p.name?.includes('يوفي') || p.name?.includes('لاك') || p.code?.includes('3296')
  );
  console.log(`\nالمنتج 1: ${prod1 ? prod1.name : 'غير موجود (snapshot فقط)'}`);
  console.log(`المنتج 2: ${prod2 ? prod2.name : 'غير موجود (snapshot فقط)'}`);

  // ===== حسابات الفاتورة =====
  const subtotal = 27825.00 + 4226.25;  // 32051.25
  const discount = 0;
  const grandTotal = subtotal - discount;  // 32051.25
  const paidAmount = 0;
  const remaining = grandTotal - paidAmount; // 32051.25

  // رقم الفاتورة
  const { count } = await supabase.from('sales_invoices').select('*', { count: 'exact', head: true });
  const invoiceNumber = `SI-${String((count || 0) + 1).padStart(5, '0')}`;

  console.log(`\n📄 رقم الفاتورة: ${invoiceNumber}`);

  // ===== إدراج الفاتورة =====
  const { data: invData, error: invError } = await supabase
    .from('sales_invoices')
    .insert([{
      invoice_number: invoiceNumber,
      customer_id: customer.id,
      warehouse_id: warehouse.id,
      invoice_date: '2025-10-08',
      status: 'approved',
      subtotal,
      discount,
      total: grandTotal,
      paid_amount: paidAmount,
      remaining_balance: remaining,
      notes: 'فاتورة مستوردة - Future for Import - فرع الترولي - 10/8/2025',
    }])
    .select();

  if (invError) { console.error('❌ خطأ في إنشاء الفاتورة:', invError); process.exit(1); }
  const newInvoice = invData[0];
  console.log(`✅ تم إنشاء الفاتورة! ID: ${newInvoice.id}`);

  // ===== إدراج أصناف الفاتورة =====
  const { data: itemsData, error: itemsError } = await supabase
    .from('sales_invoice_items')
    .insert([
      {
        invoice_id: newInvoice.id,
        product_id: prod1?.id || null,
        product_name_snapshot: 'FOR RAST MAT',
        wood_type_snapshot: 'Edge Band',
        size_snapshot: '08*22',
        color_snapshot: 'BEYAZ MAT 1001',
        quantity_sheets: 10500,
        unit_price: 2.65,
        line_total: 27825.00,
      },
      {
        invoice_id: newInvoice.id,
        product_id: prod2?.id || null,
        product_name_snapshot: 'شريط يوفي لاك 73 A',
        wood_type_snapshot: 'Edge Band',
        size_snapshot: '08*22',
        color_snapshot: 'MOZAMBIK HG',
        quantity_sheets: 805,
        unit_price: 5.25,
        line_total: 4226.25,
      },
    ])
    .select();

  if (itemsError) { console.error('❌ خطأ في إضافة الأصناف:', itemsError); process.exit(1); }
  console.log(`✅ تم إضافة ${itemsData.length} صنف`);

  // ===== تحديث رصيد العميل =====
  const newBalance = (parseFloat(customer.balance) || 0) + remaining;
  const { error: balErr } = await supabase
    .from('customers')
    .update({ balance: newBalance })
    .eq('id', customer.id);

  if (balErr) console.error('⚠️ خطأ في تحديث الرصيد:', balErr);
  else console.log(`✅ رصيد العميل الجديد: ${newBalance.toFixed(2)} جنيه`);

  // ===== ملخص =====
  console.log('\n' + '='.repeat(50));
  console.log('🎉 تمت إضافة الفاتورة بنجاح!');
  console.log('='.repeat(50));
  console.log(`  📄 رقم الفاتورة : ${newInvoice.invoice_number}`);
  console.log(`  👤 العميل        : ${customer.name} (كود ${customer.code})`);
  console.log(`  📅 التاريخ       : 2025-10-08`);
  console.log(`  💰 الإجمالي      : ${grandTotal.toLocaleString()} جنيه`);
  console.log(`  💳 المدفوع       : ${paidAmount} جنيه`);
  console.log(`  📌 المتبقي       : ${remaining.toLocaleString()} جنيه (آجل)`);
  console.log('='.repeat(50));
  console.log('✅ افتح التطبيق وروح على المبيعات عشان تشوف الفاتورة');
}

main().catch(console.error);
