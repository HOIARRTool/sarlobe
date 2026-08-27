# HA6 SAR Reviewer

เว็บสำหรับให้โรงพยาบาลส่ง SAR **ทีละมาตรฐานใหญ่** ตามมาตรฐาน HA ฉบับที่ 6 แล้วรับผลวิเคราะห์ตามเทมเพลต SAR Lobe

ผลลัพธ์มี 6 คอลัมน์:

`มาตรฐาน | องค์ประกอบ SAR | รายละเอียดที่โรงพยาบาลบันทึก | Self Score | AI-Assisted Score | For Finding`

ระบบคง `(i) บริบท` ไว้โดยไม่ให้คะแนน แยก `(ii) ผลการพัฒนาที่ได้ดำเนินการ`, `(iii) แผนการพัฒนา` และ `(iv) ผลการดำเนินการ` เป็นคนละแถว ให้คะแนนเฉพาะ `(ii)` และนำ KPI ใน `(iv)` กลับมาประกอบการให้คะแนนและ For Finding

> เครื่องมือนี้ช่วยเตรียมการทบทวนและการเรียนรู้ ไม่ใช่คำตัดสินอย่างเป็นทางการของ สรพ. หรือทีมผู้เยี่ยมสำรวจ

## รูปแบบการส่งผล

- หน้าเว็บแสดงเพียงว่าได้รับคำขอแล้ว **ไม่แสดงผลวิเคราะห์และไม่มีลิงก์ผล**
- สร้างผลเป็นไฟล์ A3 แนวนอน 2 รูปแบบ: PDF และ Word (`.docx`)
- แนบทั้งสองไฟล์ไปยังอีเมลที่ผู้ส่งกรอก
- เก็บสำเนาไฟล์เดียวกันใน My Drive ของเจ้าของระบบที่ `HA-SAR-Results/YYYY/MM`
- หากการส่งอีเมลหรือ Drive ขัดข้อง ระบบเก็บสถานะและลองส่งใหม่ตาม `DELIVERY_RETRY_SECONDS`

## สิ่งที่อยู่ในชุดนี้

- เว็บ Node.js/Express ภาษาไทย รองรับมือถือ
- ครอบคลุม 22 มาตรฐานใหญ่ใน Part I-III และหน่วยประเมินกระบวนการ 54 บท/บทย่อย รวม III-4.3 ก-ฎ
- รับ SAR แบบ PDF, DOCX, TXT, CSV และ XLSX
- รับรายงานการเยี่ยมครั้งก่อนแบบไม่บังคับ และใช้เฉพาะ Recommendation/Suggestion
- ใช้ OpenAI Responses API, Structured Outputs และ `ha-sar-lobe` แบบ versioned Skill
- ประมวลผลเบื้องหลังด้วย OpenAI webhook และ fallback poller
- ส่งอีเมลผ่าน SMTP ของ Gmail และจัดเก็บผ่าน Google Drive OAuth 2.0
- ไม่เขียนไฟล์ SAR ต้นฉบับลงดิสก์หรือฐานข้อมูล
- มี `render.yaml` สำหรับ Web Service แบบ Starter และ PostgreSQL แบบ Basic-256mb

## ติดตั้งผ่าน GitHub และ Render

### 1) อัปโหลดขึ้น GitHub

แตก ZIP แล้วอัปโหลด **เนื้อหาภายในโฟลเดอร์** ขึ้น root ของ repository ต้องเห็น `package.json` และ `render.yaml` อยู่ระดับบนสุด

```bash
git init
git add .
git commit -m "Install HA6 SAR Reviewer"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/ha-sar-reviewer.git
git push -u origin main
```

### 2) เตรียม Google Cloud สำหรับ My Drive ส่วนตัว

1. เปิด [Google Cloud Console](https://console.cloud.google.com/) แล้วสร้าง Project
2. ไปที่ **APIs & Services → Library** และ Enable **Google Drive API**
3. ตั้งค่า **OAuth consent screen** สำหรับบัญชีส่วนตัว
4. สร้าง Credential ชนิด **OAuth client ID → Web application**
5. คัดลอก `Client ID` และ `Client secret`
6. หลังทราบ URL จริงของ Render แล้ว ให้เพิ่ม Authorized redirect URI เป็น:

   `https://YOUR-SERVICE.onrender.com/oauth/google/callback`

ระบบขอ scope `drive.file` จึงจัดการได้เฉพาะไฟล์และโฟลเดอร์ที่แอปสร้างเอง ไม่ได้ขอสิทธิ์อ่าน Drive ทั้งหมด

เพื่อให้การเชื่อมไม่หมดอายุทุก 7 วัน ควรเปลี่ยน OAuth app จาก **Testing** เป็น **Production** หลังทดสอบเสร็จ หากยังอยู่ใน Testing ให้เพิ่ม Gmail ส่วนตัวเป็น Test user ก่อนเชื่อม

### 3) เตรียม Gmail สำหรับส่งอีเมล

1. เปิด 2-Step Verification ในบัญชี Gmail ส่วนตัว
2. สร้าง **App Password** สำหรับแอปนี้
3. ใช้ค่าต่อไปนี้ใน Render:

| ตัวแปร | ค่า |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Gmail ส่วนตัวที่ใช้ส่ง |
| `SMTP_PASS` | App Password 16 ตัว ไม่ใช่รหัสผ่านบัญชี |
| `MAIL_FROM` | เช่น `HA SAR Reviewer <yourname@gmail.com>` |

### 4) สร้าง Render Blueprint

1. เข้า Render Dashboard → **New → Blueprint**
2. เชื่อม GitHub repository นี้
3. Render จะสร้าง Web Service `starter` และ PostgreSQL `basic-256mb` ใน Singapore
4. กรอก Secret ที่ระบบถาม:

| ตัวแปร | ค่า |
|---|---|
| `OPENAI_API_KEY` | API key ของ OpenAI Project ที่รับค่าใช้จ่าย |
| `GOOGLE_CLIENT_ID` | OAuth Client ID จาก Google Cloud |
| `GOOGLE_CLIENT_SECRET` | OAuth Client secret จาก Google Cloud |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_USER` | Gmail ส่วนตัว |
| `SMTP_PASS` | Google App Password |
| `MAIL_FROM` | ชื่อผู้ส่งและ Gmail |

`APP_SECRET`, `ADMIN_SETUP_TOKEN` และ `DATABASE_URL` ถูกสร้างหรือเชื่อมให้อัตโนมัติ ห้ามใส่ secret จริงใน GitHub

5. รอ deploy แล้วเปิด `https://YOUR-SERVICE.onrender.com/healthz` ต้องเห็น `{"ok":true}`
6. นำ URL จริงของบริการไปใส่ Authorized redirect URI ใน Google Cloud ตามข้อ 2

### 5) เชื่อม My Drive ครั้งเดียว

1. เปิด Render → Web Service → Environment แล้วคัดลอกค่า `ADMIN_SETUP_TOKEN`
2. เปิด `https://YOUR-SERVICE.onrender.com/admin/google`
3. วาง `ADMIN_SETUP_TOKEN` แล้วกด **เชื่อมบัญชี Google**
4. ลงชื่อเข้า Gmail ส่วนตัวและอนุญาต Google Drive
5. กลับมาที่หน้า Admin แล้วต้องเห็นสถานะ **เชื่อมแล้ว**
6. กลับหน้าหลัก ปุ่ม **เริ่มวิเคราะห์ SAR** จะพร้อมใช้งาน

Refresh token ถูกเข้ารหัสด้วย `APP_SECRET` ก่อนบันทึกใน PostgreSQL ไม่เก็บใน GitHub หรือบนหน้าเว็บ

### 6) ตั้ง OpenAI webhook (แนะนำ)

สร้าง webhook ใน OpenAI Platform ให้ชี้มาที่:

`https://YOUR-SERVICE.onrender.com/webhooks/openai`

เลือก event `response.completed`, `response.failed`, `response.incomplete` และ `response.cancelled` จากนั้นเพิ่ม signing secret ที่ Render ในชื่อ `OPENAI_WEBHOOK_SECRET` แล้ว deploy ใหม่ ระบบมี fallback poller จึงยังทำงานได้หากยังไม่ตั้ง webhook แต่ผลอาจช้ากว่า

## Environment variables

| ชื่อ | จำเป็น | ค่าเริ่มต้น/หมายเหตุ |
|---|:---:|---|
| `DATABASE_URL` | ✓ | Render เชื่อมจาก PostgreSQL อัตโนมัติ |
| `OPENAI_API_KEY` | ✓ | เก็บเป็น Render secret |
| `OPENAI_MODEL` | | `gpt-5.6` |
| `APP_SECRET` | ✓ production | Render สุ่มให้ ใช้เข้ารหัส secret ในฐานข้อมูล |
| `ADMIN_SETUP_TOKEN` | ✓ production | Render สุ่มให้ ใช้เปิดกระบวนการเชื่อม Drive |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | ✓ production | OAuth Web application |
| `GOOGLE_DRIVE_FOLDER_NAME` | | `HA-SAR-Results` |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | ✓ production | ต้องครบจึงเปิดรับงาน |
| `SMTP_PORT` | | `587` |
| `SMTP_SECURE` | | `false` สำหรับ STARTTLS port 587 |
| `MAIL_FROM` | | ควรตรงกับ Gmail ผู้ส่ง |
| `OPENAI_WEBHOOK_SECRET` | | แนะนำ; หากไม่ใส่ใช้ poller |
| `MAX_FILE_MB` | | 15 MB ต่อไฟล์ |
| `RESULT_TTL_DAYS` | | เก็บ JSON ผลชั่วคราว 7 วัน; ไฟล์ใน Drive ไม่ถูกลบอัตโนมัติ |
| `POLL_INTERVAL_SECONDS` | | 30 วินาที |
| `DELIVERY_RETRY_SECONDS` | | ลองส่ง Drive/อีเมลซ้ำทุก 300 วินาที |
| `OPENAI_SKILL_ID`, `OPENAI_SKILL_VERSION` | | ใช้เมื่อต้องการ pin Skill ที่อัปโหลดเอง |

## ความเป็นส่วนตัวและความปลอดภัย

- ต้องลบ HN ชื่อผู้ป่วย และข้อมูลส่วนบุคคลที่ไม่จำเป็นก่อนอัปโหลด
- ไฟล์ต้นฉบับอยู่ใน memory เฉพาะช่วงสร้างคำขอ OpenAI และไม่ถูกเขียนลง local disk/PostgreSQL
- ผล JSON ใน PostgreSQL หมดอายุตาม `RESULT_TTL_DAYS`; PDF/Word ใน My Drive คงอยู่จนกว่าเจ้าของจะลบ
- หน้าเว็บไม่เปิดเผยผลวิเคราะห์ ผู้รับได้ผลจากไฟล์แนบอีเมลเท่านั้น
- Google refresh token ถูกเข้ารหัสแบบ AES-256-GCM ด้วย `APP_SECRET`
- เปิด `store:false` ใน Responses API; โปรดทบทวนนโยบายข้อมูลและข้อกำหนดองค์กรก่อนใช้ข้อมูลจริง
- Skill เป็นคำสั่งสิทธิ์สูง ผู้ดูแลต้อง review ทุกการแก้ไขและไม่เปิดให้ผู้ใช้แนบ Skill อื่นเอง

## รันในเครื่อง

ต้องมี Node.js 22+ และ PostgreSQL พร้อมค่า OAuth/SMTP แบบเดียวกับ production

```bash
npm install
npm test
npm start
```

ตั้ง `APP_BASE_URL=http://localhost:3000` และ Authorized redirect URI เป็น `http://localhost:3000/oauth/google/callback`

## ก่อนเปิดใช้จริง

- ตั้ง OpenAI Project budget/rate limit และติดตามต้นทุนต่อมาตรฐาน
- ทำข้อตกลงการใช้ข้อมูลและทบทวน PDPA/นโยบายโรงพยาบาล
- ทดสอบด้วย SAR ที่ de-identify แล้วอย่างน้อย 10-20 ตัวอย่าง
- ให้ผู้เยี่ยมสำรวจเทียบความสม่ำเสมอของคะแนนและ For Finding
- เปิด backup/PITR ของ PostgreSQL และตรวจพื้นที่ว่างใน My Drive
- ตรวจประกาศมาตรฐาน HA และช่วงเปลี่ยนผ่านฉบับล่าสุดก่อนใช้จริง

## License

MIT สำหรับ source code ส่วนเอกสารมาตรฐานและเนื้อหาอ้างอิงยังคงเป็นสิทธิ์ของเจ้าของต้นฉบับ
