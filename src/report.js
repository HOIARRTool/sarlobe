import { standardsByPart } from "./standards.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function page({ title, body }) {
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="topbar"><a href="/" class="brand">HA6 · SAR Review</a><span>AI-assisted preparation</span></header>
  <main class="shell">${body}</main>
  <footer>เครื่องมือนี้ช่วยทบทวนเพื่อการเรียนรู้ ไม่ใช่คำตัดสินอย่างเป็นทางการของ สรพ. หรือทีมผู้เยี่ยมสำรวจ</footer>
</body>
</html>`;
}

function standardOptions() {
  const labels = { I: "ตอนที่ I การบริหารองค์กร", II: "ตอนที่ II ระบบงานสำคัญ", III: "ตอนที่ III กระบวนการดูแลผู้ป่วย" };
  return Object.entries(standardsByPart())
    .map(([part, standards]) => `<optgroup label="${labels[part]}">${standards
      .map((item) => `<option value="${item.code}">${item.code} ${escapeHtml(item.title)}</option>`)
      .join("")}</optgroup>`)
    .join("");
}

export function homePage({ maxFileMb, deliveryReady, error = "" }) {
  const emailNote = deliveryReady
    ? "เมื่อวิเคราะห์เสร็จ ระบบจะส่งไฟล์ PDF และ Word ไปยังอีเมลนี้เท่านั้น และเก็บสำเนาใน Google Drive ของผู้ดูแลระบบ"
    : "ระบบยังไม่พร้อมรับงาน: ผู้ดูแลต้องเชื่อม Google Drive และตั้งค่าอีเมลให้เรียบร้อยก่อน";
  return page({
    title: "HA6 SAR Reviewer",
    body: `
      ${error ? `<div class="alert error">${escapeHtml(error)}</div>` : ""}
      <form class="review-form" action="/review" method="post" enctype="multipart/form-data">
        <section class="panel">
          <div class="section-no">01</div><div class="section-content">
            <h2>เลือกมาตรฐาน</h2>
            <label>มาตรฐาน HA ฉบับที่ 6
              <select name="standard_code" required><option value="">— เลือกมาตรฐาน —</option>${standardOptions()}</select>
            </label>
            <p class="hint">หนึ่งคำขอต่อหนึ่งมาตรฐานใหญ่ เช่น II-3 ระบบจะวิเคราะห์มาตรฐานย่อยภายในให้ครบ</p>
          </div>
        </section>
        <section class="panel">
          <div class="section-no">02</div><div class="section-content">
            <h2>แนบข้อมูลของโรงพยาบาล</h2>
            <label>SAR ของมาตรฐานที่เลือก <span class="required">จำเป็น*</span>
              <input type="file" name="sar_file" accept=".pdf,.docx,.txt,.csv,.xlsx" required>
            </label>
            <p class="hint">PDF, DOCX, TXT, CSV หรือ XLSX ไม่เกิน ${maxFileMb} MB · หาก DOCX มีกราฟเป็นรูปภาพ แนะนำแปลงเป็น PDF ก่อน</p>
            <label>รายงานการเยี่ยมสำรวจครั้งที่ผ่านมา <span class="optional">ถ้ามี</span>
              <input type="file" name="prior_report" accept=".pdf,.docx,.txt">
            </label>
            <p class="hint">ระบบจะใช้เฉพาะข้อเสนอแนะ/คำแนะนำที่เกี่ยวข้อง ไม่ใช้ Evidence เดิมแทนหลักฐานปัจจุบัน</p>
            <label>หมายเหตุเพิ่มเติม <span class="optional">ถ้ามี</span>
              <textarea name="notes" rows="4" maxlength="8000" placeholder="เช่น รอบการประเมิน, ขอบเขตบริการ หรือประเด็นที่อยากให้ระวัง"></textarea>
            </label>
          </div>
        </section>
        <section class="panel">
          <div class="section-no">03</div><div class="section-content">
            <h2>รับผลการวิเคราะห์</h2>
            <div class="two-col">
              <label>อีเมล<input type="email" name="email" required autocomplete="email"></label>
              <label>ยืนยันอีเมล<input type="email" name="email_confirm" required autocomplete="email"></label>
            </div>
            <p class="hint">${escapeHtml(emailNote)}</p>
            <label class="check"><input type="checkbox" name="privacy_confirm" value="yes" required><span>ฉันตรวจแล้วว่าไฟล์ไม่มี HN ชื่อผู้ป่วย หรือข้อมูลส่วนบุคคลที่ไม่จำเป็น และยอมรับว่าผลเป็น AI-assisted review</span></label>
            <button class="primary" type="submit" ${deliveryReady ? "" : "disabled"}>เริ่มวิเคราะห์ SAR</button>
          </div>
        </section>
      </form>
      <aside class="notice"><strong>ช่วงเปลี่ยนผ่านมาตรฐาน</strong> HA ฉบับที่ 6 มีผลใช้เพื่อการรับรองตั้งแต่ 1 ตุลาคม 2569 โปรดยืนยันมาตรฐานที่ใช้จริงตามวันประเมินและประกาศของ สรพ.</aside>`,
  });
}

export function submittedPage(job) {
  return page({
    title: "รับคำขอวิเคราะห์ SAR แล้ว",
    body: `<section class="status-card">
      <div class="status-mark">✓</div>
      <p class="eyebrow">${escapeHtml(job.standard_code)}</p>
      <h1>รับคำขอแล้ว</h1>
      <p>ระบบกำลังวิเคราะห์ SAR และจะส่งผลเป็นไฟล์ <strong>PDF และ Word ทางอีเมลเท่านั้น</strong></p>
      <p class="hint">เลขอ้างอิง: ${escapeHtml(job.id)} · หน้าเว็บนี้จะไม่แสดงผลการวิเคราะห์</p>
      <div class="alert warning wait-note"><strong>โปรดรอประมาณ 20–30 นาที</strong><br>กรุณารออีเมลแจ้งผลและอย่ากดส่งมาตรฐานเดิมซ้ำระหว่างประมวลผล เพราะจะสร้างคำขอซ้ำ ใช้โควตาเพิ่ม และอาจทำให้การประมวลผลล่าช้า</div>
      <a class="secondary link-button" href="/">ส่งมาตรฐานอื่น</a>
    </section>`,
  });
}

export function googleAdminPage({ connection, message = "", error = "" }) {
  const status = connection?.connected
    ? `เชื่อมแล้ว${connection.email ? `: ${escapeHtml(connection.email)}` : ""}`
    : "ยังไม่ได้เชื่อม";
  return page({
    title: "ตั้งค่า Google Drive",
    body: `<section class="status-card admin-card">
      <div class="status-mark">G</div>
      <p class="eyebrow">ADMIN SETUP</p>
      <h1>Google Drive ส่วนตัว</h1>
      ${message ? `<div class="alert success">${escapeHtml(message)}</div>` : ""}
      ${error ? `<div class="alert error">${escapeHtml(error)}</div>` : ""}
      <p><strong>สถานะ:</strong> ${status}</p>
      <p>ระบบจะสร้างโฟลเดอร์ <code>HA-SAR-Results/YYYY/MM</code> และเก็บไฟล์ Word/PDF ที่สร้างโดยแอป</p>
      <form action="/admin/google/connect" method="post">
        <label>ADMIN_SETUP_TOKEN<input name="admin_token" type="password" required autocomplete="off"></label>
        <button class="primary" type="submit">เชื่อมบัญชี Google</button>
      </form>
    </section>`,
  });
}

export function notFoundPage() {
  return page({ title: "ไม่พบหน้า", body: `<section class="status-card failed"><div class="status-mark">?</div><h1>ไม่พบหน้าที่ต้องการ</h1><p>โปรดกลับไปหน้าหลักและส่งคำขอใหม่</p><a class="secondary link-button" href="/">กลับหน้าหลัก</a></section>` });
}
