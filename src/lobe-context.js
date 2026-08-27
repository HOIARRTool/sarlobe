import { readFileSync } from "node:fs";

const HA6_INDEX = readFileSync(
  new URL("../skills/ha-sar-lobe/references/ha6-standard-index.md", import.meta.url),
  "utf8",
);
const SPA_INDEX = readFileSync(
  new URL("../skills/ha-sar-lobe/references/spa-2022-guidance.md", import.meta.url),
  "utf8",
);

function baseCode(code) {
  return String(code).replace(/\s+[ก-ฮ]$/u, "");
}

function selectedCodes(standard) {
  return [...new Set(standard.subchapters.map(([code]) => baseCode(code)))];
}

function firstCell(line) {
  if (!line.startsWith("|")) return "";
  return line.split("|")[1]?.trim() || "";
}

function rowsForCodes(markdown, codes) {
  return markdown
    .split("\n")
    .filter((line) => {
      const cell = firstCell(line);
      return codes.some((code) => cell === code || cell.startsWith(`${code} `));
    });
}

function editionControl(standardCode) {
  const controls = [
    "SPA 2022 อิง HA5; ต้องให้ HA6 overall requirement และ SAR 2026 เป็นตัวควบคุมการตีความ",
  ];
  if (standardCode === "II-7") {
    controls.push("ห้าม map II-7.3/II-7.4 ตามรหัสตรง ๆ: SPA5 ใช้ II-7.3 สำหรับ anatomical pathology และ II-7.4 สำหรับ blood bank แต่ HA6 สลับเป็น II-7.3 blood bank และ II-7.4 anatomical pathology/cytology/forensic");
  }
  if (standardCode === "II-10") {
    controls.push("SPA 2022 ไม่มีบท II-10; ใช้ข้อกำหนด HA6 และหลักฐาน digital/clinical governance ของโรงพยาบาลโดยตรง");
  }
  if (standardCode === "III-4") {
    controls.push("ตรวจ III-4.3 ทุกหัวข้อเฉพาะที่อยู่ในขอบเขตบริการ และคง critical care ซึ่ง HA6 ระบุหรือขยายชัดเจน");
  }
  return controls;
}

export function buildFocusedLobeContext(standard) {
  const codes = selectedCodes(standard);
  const ha6Rows = rowsForCodes(HA6_INDEX, codes);
  const spaRows = rowsForCodes(SPA_INDEX, codes);
  if (ha6Rows.length < codes.length) {
    throw new Error(`SAR Lobe HA6 context is incomplete for ${standard.code}`);
  }

  const controls = editionControl(standard.code);
  return `
SAR Lobe context เฉพาะ ${standard.code} ${standard.title}

ข้อกำหนดโดยรวม HA6 ที่เกี่ยวข้องเท่านั้น:
${ha6Rows.join("\n")}

SPA 2022 ที่ map กับมาตรฐานนี้เท่านั้น (ใช้เป็นคำถาม/แนวทาง ไม่ใช่ checklist ให้คะแนน):
${spaRows.length ? spaRows.join("\n") : "ไม่มีบท SPA ที่ตรงโดยตรง ให้ใช้ HA6 และหลักฐานของโรงพยาบาลเป็นหลัก"}
${controls.length ? `\nข้อควบคุมการเทียบฉบับ:\n${controls.map((item) => `- ${item}`).join("\n")}` : ""}

กติกา SAR Lobe ส่วนกลางที่ต้องคงไว้:
- ให้คะแนนภาพรวมตาม maturity anchor: 1 Design/early implementation, 2 Partial implementation, 3 Effective implementation และใช้ผลวัดพัฒนา, 4 Continuous improvement/integration, 5 Role model/innovation/impact
- รายละเอียด SPA หรือหลักฐานที่ไม่ปรากฏใน SAR เป็นประเด็นค้นหาต่อ ไม่ใช่ GAP หรือเหตุลดคะแนนโดยอัตโนมัติ
- KPI ต่ำกว่าเป้าหมายเพียงตัวเดียวไม่จำกัดคะแนนทั้งข้อ เว้นแต่ scope ตรงและแสดงความไม่น่าเชื่อถือของระบบอย่างมีนัยสำคัญ
- แยก process nonconformity, near miss และ actual harm; ห้ามอนุมาน harm โดยไม่มีหลักฐาน
- ถ้า AI-Assisted Score ต่ำกว่า Self Score ต้องระบุ maturity anchor ที่ยังไม่ถึง หลักฐานสำคัญที่จำกัดข้อกำหนดโดยรวม และเหตุผลว่าเป็น score-limiting ไม่ใช่เพียง For Finding
- คงโครงแถว (i) บริบท, (ii) ผลการพัฒนา, (iii) แผนการพัฒนา, (iv) ผลการดำเนินการ และลำดับ For Finding ตาม schema/prompt
`.trim();
}

export function focusedLobeCodes(standard) {
  return selectedCodes(standard);
}
