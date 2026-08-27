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

export function emailConfigured() {
  return Boolean(getTransporter());
}

export async function sendReadyEmail({ email, standardCode, standardTitle, files }) {
  const mail = getTransporter();
  if (!mail) return false;
  await mail.sendMail({
    from: config.smtp.from,
    to: email,
    subject: `ผลตรวจ SAR ${standardCode} พร้อมแล้ว`,
    text: `ผลตรวจ SAR ${standardCode} ${standardTitle} พร้อมแล้ว\n\nแนบผลการวิเคราะห์ 2 ไฟล์: PDF และ Word\n\nผลนี้เป็น AI-assisted review ไม่ใช่คำตัดสินอย่างเป็นทางการของ สรพ. หรือทีมผู้เยี่ยมสำรวจ`,
    html: `<p>ผลตรวจ SAR <strong>${escapeHtml(standardCode)} ${escapeHtml(standardTitle)}</strong> พร้อมแล้ว</p>
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

export async function sendFailureEmail({ email, standardCode }) {
  const mail = getTransporter();
  if (!mail) return false;
  await mail.sendMail({
    from: config.smtp.from,
    to: email,
    subject: `ไม่สามารถประมวลผล SAR ${standardCode} ได้`,
    text: `ระบบไม่สามารถประมวลผล SAR ${standardCode} ได้ในครั้งนี้ กรุณากลับไปที่เว็บไซต์และส่งคำขอใหม่ หรือติดต่อผู้ดูแลระบบ`,
  });
  return true;
}
