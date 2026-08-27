# Checklist ติดตั้ง HA6 SAR Reviewer

## GitHub

- [ ] อัปโหลดไฟล์ด้านใน ZIP ขึ้น root ของ repository
- [ ] เห็น `package.json`, `package-lock.json`, `render.yaml`, `src/` และ `skills/`
- [ ] ตั้ง default branch เป็น `main`
- [ ] รัน `npm test` ผ่าน

## Google Cloud และ Gmail ส่วนตัว

- [ ] Enable Google Drive API
- [ ] สร้าง OAuth Client ID ชนิด Web application
- [ ] เตรียม `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET`
- [ ] เปิด 2-Step Verification ของ Gmail
- [ ] สร้าง Google App Password สำหรับ SMTP
- [ ] หลัง deploy เพิ่ม redirect URI: `https://ชื่อเว็บ.onrender.com/oauth/google/callback`
- [ ] เปลี่ยน OAuth app เป็น Production เมื่อต้องการใช้ระยะยาว

## Render

- [ ] New → Blueprint → เลือก GitHub repository
- [ ] ยืนยัน Web `starter` และ PostgreSQL `basic-256mb`
- [ ] ใส่ `OPENAI_API_KEY`
- [ ] ใส่ `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET`
- [ ] ใส่ Gmail SMTP: host, user, App Password และ mail from
- [ ] เปิด `/healthz` แล้วเห็น `{"ok":true}`

## เชื่อม My Drive ครั้งเดียว

- [ ] คัดลอก `ADMIN_SETUP_TOKEN` จาก Render Environment
- [ ] เปิด `/admin/google`
- [ ] ใส่ token แล้วลงชื่อเข้า Gmail ส่วนตัว
- [ ] หน้า Admin แสดงสถานะเชื่อมแล้ว
- [ ] หน้าหลักเปิดปุ่มเริ่มวิเคราะห์

## OpenAI webhook

- [ ] สร้าง endpoint `https://ชื่อเว็บ.onrender.com/webhooks/openai`
- [ ] เลือก completed/failed/incomplete/cancelled
- [ ] เพิ่ม `OPENAI_WEBHOOK_SECRET` ใน Render แล้ว deploy ใหม่

## ทดสอบก่อนใช้งานจริง

- [ ] ใช้ SAR ที่ de-identify แล้ว 1 มาตรฐาน
- [ ] หน้าเว็บแสดงเพียงรับคำขอและไม่แสดงผลวิเคราะห์
- [ ] ได้อีเมลพร้อมไฟล์แนบ PDF และ Word ทั้งสองไฟล์
- [ ] พบไฟล์เดียวกันใน `My Drive/HA-SAR-Results/YYYY/MM`
- [ ] เปิด PDF แล้วตารางไทยอ่านได้ ไม่มีข้อความล้น
- [ ] เปิด Word แล้วตารางไทยอ่านได้ และมาตรฐานย่อย merge ครอบ ii-iv
- [ ] บริบท (i) ไม่มีคะแนนหรือ Finding
- [ ] Score แสดงเฉพาะแถว (ii)
- [ ] For Finding เรียง: บริบท/ข้อกำหนด → KPI → คำแนะนำเดิม (ถ้ามี) → ค้นหาต่อ
- [ ] แผน (iii) แยกแถว และ KPI (iv) สะท้อนกลับไปยัง (ii)
- [ ] ทดสอบอีเมลปลายทางอย่างน้อย Gmail และบัญชีองค์กรหนึ่งบัญชี
