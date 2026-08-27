import nodemailer from "nodemailer";
import { config } from "./config.js";

let transporter;

function getTransporter() {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) return null;
  transporter ??= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jobReference(jobId) {
  return String(jobId || "").slice(0, 8).toUpperCase() || "ไม่ระบุ";
}

function submittedAtThai(createdAt) {
  if (!createdAt) return "ไม่ระบุ";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function emailJobDetails({ jobId, createdAt }) {
  return {
    reference: jobReference(jobId),
    submittedAt: submittedAtThai(createdAt),
  };
}

export function emailConfigured() {
  return Boolean(getTransporter());
}

export async function sendReadyEmail({ email, standardCode, standardTitle, files, jobId, createdAt }) {
  const mail = getTransporter();
  if (!mail) return false;
  const details = emailJobDetails({ jobId, createdAt });
  await mail.sendMail({
    from: config.smtp.from,
    to: email,
    subject: `ผลตรวจ SAR ${standardCode} พร้อมแล้ว · Ref ${details.reference}`,
    text: `ผลตรวจ SAR ${standardCode} ${standardTitle} พร้อมแล้ว\n\nเลขอ้างอิง: ${details.reference}\nรับคำขอเมื่อ: ${details.submittedAt} น.\n\nแนบผลการวิเคราะห์ 2 ไฟล์: PDF และ Word\n\nผลนี้เป็น AI-assisted review ไม่ใช่คำตัดสินอย่างเป็นทางการของ สรพ. หรือทีมผู้เยี่ยมสำรวจ`,
    html: `<p>ผลตรวจ SAR <strong>${escapeHtml(standardCode)} ${escapeHtml(standardTitle)}</strong> พร้อมแล้ว</p>
      <p>เลขอ้างอิง: <strong>${escapeHtml(details.reference)}</strong><br>รับคำขอเมื่อ: ${escapeHtml(details.submittedAt)} น.</p>
      <p>แนบผลการวิเคราะห์มาพร้อมอีเมลนี้ 2 ไฟล์: <strong>PDF และ Word</strong></p>
      <p><small>ผลนี้เป็น AI-assisted review ไม่ใช่คำตัดสินอย่างเป็นทางการของ สรพ. หรือทีมผู้เยี่ยมสำรวจ</small></p>`,
    attachments: [files.pdf, files.docx].map((file) => ({
      filename: file.name,
      content: file.buffer,
      contentType: file.mimeType,
    })),
  });
  return true;
}

export async function sendFailureEmail({
  email,
  standardCode,
  standardTitle,
  jobId,
  createdAt,
  inputIssue = "",
}) {
  const mail = getTransporter();
  if (!mail) return false;
  const details = emailJobDetails({ jobId, createdAt });
  const isInputIssue = Boolean(inputIssue);
  await mail.sendMail({
    from: config.smtp.from,
    to: email,
    subject: `${isInputIssue ? "โปรดตรวจสอบไฟล์" : "ไม่สามารถประมวลผล"} SAR ${standardCode} · Ref ${details.reference}`,
    text: isInputIssue
      ? `ระบบหยุดก่อนให้คะแนน SAR ${standardCode} ${standardTitle || ""}\n\nเลขอ้างอิง: ${details.reference}\nรับคำขอเมื่อ: ${details.submittedAt} น.\n\nสาเหตุ: ${inputIssue}\n\nระบบไม่ได้สร้าง PDF/Word กรุณาตรวจสอบมาตรฐานที่เลือกและไฟล์ SAR แล้วส่งคำขอใหม่`
      : `ระบบไม่สามารถประมวลผล SAR ${standardCode} ${standardTitle || ""} ได้ในครั้งนี้\n\nเลขอ้างอิง: ${details.reference}\nรับคำขอเมื่อ: ${details.submittedAt} น.\n\nกรุณากลับไปที่เว็บไซต์และส่งคำขอใหม่ หรือติดต่อผู้ดูแลระบบ`,
  });
  return true;
}
