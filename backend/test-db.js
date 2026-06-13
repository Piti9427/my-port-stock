const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
  console.error("❌ Missing or invalid SUPABASE_URL / SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log(`Testing connection to: ${supabaseUrl}...`);
  
  // Try to query the portfolio table
  const { data, error } = await supabase.from('portfolio').select('*').limit(1);
  
  if (error) {
    // 42P01 is PostgreSQL error code for "undefined_table"
    if (error.code === '42P01') {
       console.log("✅ เชื่อมต่อ Supabase สำเร็จแล้ว!");
       console.log("⚠️ แต่ยังไม่พบตาราง 'portfolio' ในฐานข้อมูล (คุณต้องนำไฟล์ supabase_schema.sql ไปรันใน SQL Editor ก่อนครับ)");
    } else {
       console.error("❌ เชื่อมต่อล้มเหลว หรือมีข้อผิดพลาดอื่นเกิดขึ้น:");
       console.error(error.message);
    }
  } else {
    console.log("✅ เชื่อมต่อ Supabase สำเร็จ!");
    console.log("✅ พบตาราง 'portfolio' เรียบร้อยแล้ว พร้อมใช้งานครับ");
    if (data.length > 0) {
      console.log(`ตัวอย่างข้อมูลที่ดึงได้: ${data[0].ticker}`);
    } else {
      console.log("ตารางว่างเปล่า (ยังไม่มีข้อมูล)");
    }
  }
}

testConnection();
