const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const {
  createScopedClient,
  supabaseConfigured,
  supabaseUrl,
} = require("../src/db/supabaseClient");

if (!supabaseConfigured) {
  console.error(
    "❌ Missing or invalid SUPABASE_URL / SUPABASE_ANON_KEY in .env",
  );
  process.exit(1);
}

async function testConnection() {
  console.log(`Testing connection to Supabase Url: ${supabaseUrl}...`);

  const mockUserId = "dev_test_user_999";
  console.log(
    `1. Generating Scoped Supabase Client for user: ${mockUserId}...`,
  );

  const client = createScopedClient(mockUserId);
  if (!client) {
    console.error(
      "❌ Failed to create scoped client. Check SUPABASE_JWT_SECRET configuration.",
    );
    process.exit(1);
  }

  console.log("✅ Scoped client generated successfully with signed JWT!");

  console.log("2. Querying holdings table with RLS...");
  const { data, error } = await client.from("holdings").select("*").limit(1);

  if (error) {
    console.error("❌ Database Query Failed:");
    console.error(error.message);
    console.error("error code:", error.code);

    if (error.code === "42P01") {
      console.log(
        "\n💡 คำแนะนำ: ยังไม่มีตาราง 'holdings' ใน Supabase ของคุณ คุณต้องนำเนื้อหาใน backend/supabase_schema.sql ไปรันใน SQL Editor ของ Supabase ก่อนครับ",
      );
    }
  } else {
    console.log(
      "✅ เชื่อมต่อ Supabase สำเร็จด้วย Clerk JWT และผ่าน RLS เรียบร้อย!",
    );
    console.log(
      `✅ พบตาราง 'holdings' พร้อมใช้งาน (พบข้อมูล ${data.length} แถว)`,
    );
  }
}

testConnection();
