const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://wgtocngbhhpyieorzirt.supabase.co';
const supabaseKey = 'sb_publishable_2RJT303kaqZBciA6kez3sg_lP4MqTYw';
const supabase = createClient(supabaseUrl, supabaseKey);

const items = [
  { no: 1, code: '721', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'أبيض (وش مجسّم/ملمس خطوط)', notes: null },
  { no: 2, code: '722', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'أسود / فحمي غامق (وش مجسّم)', notes: null },
  { no: 3, code: '724', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'رمادي غامق (وش مجسّم)', notes: null },
  { no: 4, code: '725', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بيج فاتح / كريمي (وش مجسّم)', notes: null },
  { no: 5, code: '726', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بيج فاتح رمادي (وش مجسّم)', notes: null },
  { no: 6, code: '727', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'أخضر فاتح هادي (وش مجسّم)', notes: null },
  { no: 7, code: '728', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'أزرق سماوي رمادي فاتح (وش مجسّم)', notes: 'الكود ظاهر جزئيًا على عينته، وواضح في صورة تانية' },
  { no: 8, code: '729', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'وردي فاتح (وش مجسّم)', notes: null },
  { no: 9, code: '741', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'أبيض', notes: null },
  { no: 10, code: '742', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'أسود / فحمي غامق', notes: null },
  { no: 11, code: '743', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'أبيض مائل للرمادي الفاتح', notes: null },
  { no: 12, code: '744', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'رمادي غامق', notes: null },
  { no: 13, code: '745', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بيج فاتح / كريمي', notes: null },
  { no: 14, code: '746', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بيج فاتح رمادي', notes: null },
  { no: 15, code: '747', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'أخضر فاتح هادي', notes: null },
  { no: 16, code: '749', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'وردي فاتح', notes: null },
  { no: 17, code: '750', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'وردي / روز', notes: null },
  { no: 18, code: '5015', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بني عسلي متوسط (خشب قديم بتشققات)', notes: null },
  { no: 19, code: '5017', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بني غامق (خشب)', notes: null },
  { no: 20, code: '5064', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بني غامق (جوز)', notes: null },
  { no: 21, code: '5090', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'رمادي مائل للبني (خشب)', notes: null },
  { no: 22, code: '5092', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بني محمر غامق (خشب)', notes: null },
  { no: 23, code: '5093', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بني فاتح / بلوط طبيعي', notes: null },
  { no: 24, code: '5102', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'رمادي فاتح (بلوط)', notes: null },
  { no: 25, code: '5107', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بيج وردي فاتح (بلوط)', notes: null },
  { no: 26, code: '5114', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'برتقالي عسلي فاتح (خشب)', notes: null },
  { no: 27, code: '5115', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بيج فاتح / كريمي (بلوط)', notes: 'الكود مكتوب بخط اليد على العينة' },
  { no: 28, code: '5118', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بيج فاتح (بلوط)', notes: null },
  { no: 29, code: '5122', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'رمادي مائل للبيج (خطوط خشب)', notes: null },
  { no: 30, code: '5141', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بني رمادي فاتح (خطوط بارزة/مضلّع)', notes: null },
  { no: 31, code: '5149', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'رمادي (رخام بعروق بيضاء وعرق أزرق)', notes: null },
  { no: 32, code: '5150', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'رمادي غامق (رخام بعروق بيضاء وعرق نحاسي)', notes: null },
  { no: 33, code: '5155', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'أبيض ورمادي (رخام)', notes: 'الكود في الصورة مش واضح 100% (الصورة مهزوزة)، راجعه' },
  { no: 34, code: '5193', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بني رمادي غامق (نقشة شيفرون)', notes: null },
  { no: 35, code: '5194', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بلوط فاتح طبيعي', notes: null },
  { no: 36, code: '5195', wood_type: 'MDF N.L', size: '122*280', price: 2040, color: 'بني محمر (نقشة شيفرون)', notes: null }
];

async function main() {
  console.log('Starting upload of 36 MDF N.L items...');
  
  // 1. Fix typo 5419 -> 5149 if it exists
  const { data: typoItem } = await supabase.from('products').select('*').eq('code', '5419').maybeSingle();
  if (typoItem) {
    console.log('Fixing typo code 5419 to 5149...');
    await supabase.from('products').update({ code: '5149' }).eq('id', typoItem.id);
  }

  // 2. Fetch all products currently in DB
  const { data: allProducts, error: fetchErr } = await supabase.from('products').select('*');
  if (fetchErr) {
    console.error('Error fetching products:', fetchErr);
    process.exit(1);
  }

  const productByCode = new Map(allProducts.map(p => [p.code, p]));
  let updatedCount = 0;
  let insertedCount = 0;

  for (const item of items) {
    const existing = productByCode.get(item.code);
    if (existing) {
      // Update
      const { error: updErr } = await supabase.from('products').update({
        name: `N.LAM ${item.code}`,
        wood_type: item.wood_type,
        size: item.size,
        selling_price: item.price,
        color: item.color,
        notes: item.notes,
        category: 'ألواح أخشاب',
        is_active: true,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);

      if (updErr) {
        console.error(`Error updating ${item.code}:`, updErr);
      } else {
        updatedCount++;
        console.log(`[UPDATED] ${item.code} - ${item.color} -> Price: ${item.price}`);
      }
    } else {
      // Insert
      const { error: insErr } = await supabase.from('products').insert([{
        code: item.code,
        name: `N.LAM ${item.code}`,
        wood_type: item.wood_type,
        category: 'ألواح أخشاب',
        size: item.size,
        color: item.color,
        purchase_price: 0,
        selling_price: item.price,
        stock_quantity: 0,
        min_stock_level: 10,
        notes: item.notes,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

      if (insErr) {
        console.error(`Error inserting ${item.code}:`, insErr);
      } else {
        insertedCount++;
        console.log(`[INSERTED] ${item.code} - ${item.color} -> Price: ${item.price}`);
      }
    }
  }

  console.log('--- Upload Finished ---');
  console.log(`Total processed: ${items.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Inserted: ${insertedCount}`);
}

main();
