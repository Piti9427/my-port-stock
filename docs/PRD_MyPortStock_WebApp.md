# Product Requirements Document (PRD)
**Project Name:** MyPortStock Web App (Personal AI Trading Assistant)
**Vision:** เปลี่ยนจากระบบวิเคราะห์ผ่าน CLI แบบเดิม มาเป็น Web App สไตล์ CIO Dashboard แบบครบวงจร (Full-Featured Suite) ที่สามารถใช้งานได้ทุกที่ เพื่อลดต้นทุน Token ของ AI, ตัดอารมณ์ในการเทรดด้วยระบบคำนวณอัตโนมัติ, และติดตามผลลัพธ์ได้อย่างเป็นระบบ

---

## 1. Core User Flow (The CIO Dashboard)
**หน้าหลัก (Dashboard):**
- แสดงผลสรุปพอร์ตการลงทุนปัจจุบัน (Total Portfolio Value, Daily P/L, Unrealized P/L) โดยดึงข้อมูลจาก Database.
- แสดง Watchlist หรือหุ้นที่กำลังถืออยู่ พร้อมดึงราคา Real-time (Yahoo Finance API) มาแสดงอัตโนมัติ.
- มีหน้าต่าง "Track Performance" โชว์กราฟเส้นแบบสวยงาม ย้อนหลังตามช่วงเวลาต่างๆ (1M, 3M, YTD) แบบที่แอปการเงินมาตรฐานมี

**การเข้าถึงรายตัว (Ticker Drilldown):**
- เมื่อกดที่หุ้นแต่ละตัว จะเข้าสู่หน้ารายละเอียดหุ้นนั้นๆ 
- แสดงประวัติการเทรดที่ผ่านมา (Trade Journal) 
- มีปุ่ม **"Analyze Setup"** เพื่อเรียกใช้งาน AI

---

## 2. AI Execution Logic (Multi-Agent Pipeline)
เมื่อผู้ใช้กดวิเคราะห์หุ้น ระบบหลังบ้าน (Backend) จะทำหน้าที่:
1. **Data Prep:** ดึงข้อมูลหุ้นตัวนั้นจาก Database (ประวัติ/ขนาดไม้) + ราคา Live Price.
2. **Parallel Processing:** ยิง Request ขนานกัน 3 เส้นทางไปหา Gemini API:
   - `@fundamental-auditor`: ตรวจสอบงบการเงิน โมเดลธุรกิจ ความคุ้มค่า
   - `@quant-technician`: ตรวจสอบจุดเข้า จุดออก กราฟเทคนิค
   - `@macro-strategist`: ตรวจสอบภาพรวมเศรษฐกิจและเม็ดเงิน (Flow)
3. **Synthesis:** นำผลลัพธ์ทั้ง 3 มาประมวลผล สรุปเป็น "Conviction Score" รวม และคำแนะนำ (Buy/Hold/Trim/Sell/Wait) โชว์ที่หน้าจอทันทีแบบครอบคลุมทุกมิติ

---

## 3. Trade Journal & Risk Management (Guided Form)
- เมื่อตัดสินใจจะทำธุรกรรม ผู้ใช้จะกดปุ่ม **"Log Trade"**
- ระบบจะแสดง Form ขึ้นมาให้กรอกข้อมูลบังคับ:
  - Entry Price (จุดเข้า)
  - Stop Loss (จุดตัดขาดทุน)
  - Target Price (จุดทำกำไรเป้าหมาย)
  - Capital Allocated (จำนวนเงินที่จะลง)
- **Auto Risk Calc:** ระบบคำนวณสดๆ ตรงนั้นเลยว่า Risk/Reward (R:R) ได้เท่าไหร่, ถ้าโดน Stop Loss จะเสียเงินกี่บาท (THB Risk Budget) เกินข้อบังคับของ SOP หรือไม่
- หากความเสี่ยงเกิน Form จะขึ้นสีแดงเตือนสติทันทีก่อนให้กดบันทึกลง Database (Emotional Guardrail).

**Scenario Planner & Position Sizing (ถัวเฉลี่ย & แผนแนวรับ):**
- **UI Placement:** ซ่อนอยู่ใน Side Panel ด้านขวา (Drawer) ที่จะสไลด์เปิดออกมาเมื่อเรากดเลือกหุ้น เพื่อประหยัดพื้นที่หลัก
- **AI Automation:** AI จะประเมินและใส่ค่า "แนวรับ (Support Levels)" ให้อัตโนมัติ 3 ระดับ พร้อมจุดตัดขาดทุน และเป้าหมายทำกำไร (โดยเปิดให้ User พิมพ์แก้ค่าเองได้ 100%)
- **Glass Data Grid:** แสดงตารางสไตล์กระจก พร้อมตัวเลขเรืองแสง (เขียว=กำไร, แดง=ขาดทุน) ที่โชว์ข้อมูลครบจบ ได้แก่:
  1. ทุนเฉลี่ยใหม่ (New Average Cost)
  2. กำไรคาดหวัง (Expected Profit เป็น % และ บาท)
  3. อัตราส่วน Risk/Reward (R/R)
  4. ขาดทุนสูงสุดที่ Stop Loss (Max Loss)
- **Goal:** เพื่อให้เห็นภาพรวมจำลองล่วงหน้าว่า "ถ้าซื้อราคานี้ ถัวราคานี้ ต้นทุนจะเป็นเท่าไหร่ และคุ้มค่าความเสี่ยงหรือไม่" ก่อนตัดสินใจส่งคำสั่งจริง

---

## 4. Advanced Features (Full-Featured Suite Extension)
- **Performance Backtester:** โมดูลสำหรับรันจำลองการเทรด (Simulation) ย้อนหลัง ตามกฎ SOP ที่เรามี เพื่อดูว่าถ้าระบบ AI แนะนำแบบนี้ในอดีต Win Rate จะเป็นเท่าไหร่.
- **Automated Alerts (LINE/Email):** 
  - สรุปภาพรวมพอร์ตส่งเข้า LINE ทุกเช้าหรือเย็น
  - แจ้งเตือนถ้าราคาหุ้นถึงจุด Stop Loss หรือถึงระดับที่ควรพิจารณา Trim.

---

## 5. Technical & Data Architecture
- **Frontend:** React + Vite, ตกแต่งด้วย CSS โมเดิร์น (Glassmorphism, Dark Mode) เพื่อให้เหมือน Trading Terminal ระดับโปร
- **Backend:** Node.js / Express (ทำหน้าที่เป็นสื่อกลาง คุม Flow ทั้งหมดเพื่อป้องกัน API Key รั่วไหล)
- **Database:** Supabase (PostgreSQL) เป็นศูนย์กลางข้อมูล 100% (Fully Database-Driven). โครงสร้าง Database ประกอบด้วย:
  - `positions`: ตารางเก็บสถานะหุ้นปัจจุบัน
  - `trade_journal`: ตารางเก็บบันทึกการตัดสินใจเข้าออก
  - `performance_logs`: ตารางเก็บ History ยอดเงินรวมรายวันเพื่อวาดกราฟ
- **AI Integration:** `@google/genai` (Gemini API) เรียกใช้ที่ Backend.
- **Market Data:** `yahoo-finance2` (Node.js) ดึงข้อมูล Tier 2.
