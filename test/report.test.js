import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import {
  buildReportFiles,
  findingSections,
  PDF_PAGE_MARGINS,
  PDF_WIDTHS,
} from "../src/report-files.js";
import { submittedPage } from "../src/report.js";

function fixture(prior = null) {
  return {
    input_validation: {
      status: "matched",
      selected_standard_code: "II-3",
      primary_file_name: "sar.pdf",
      detected_standard_codes: ["II-3"],
      explanation: "พบเนื้อหาสาระของ II-3",
      source_reference: "sar.pdf หน้า 1",
    },
    standard_code: "II-3",
    standard_title: "สิ่งแวดล้อมในการดูแลผู้ป่วย/ผู้รับผลงาน",
    major_context: { hospital_text: "บริบทโรงพยาบาล", source_reference: "SAR หน้า 1" },
    subchapters: [{
      code: "II-3.1",
      title: "สิ่งแวดล้อมทางกายภาพและความปลอดภัย",
      development: {
        hospital_text: "พัฒนาระบบแล้ว", source_reference: "SAR หน้า 2", self_score: 3,
        ai_assisted_score: 3, score_rationale: "effective implementation",
        for_finding: {
          context_requirement_alignment: "สอดคล้องบางส่วน",
          development_indicator_linkage: "เชื่อม KPI A",
          prior_recommendation_progress: prior,
          further_finding: "ขอตามรอยพื้นที่",
        },
      },
      development_plan: { hospital_text: "แผนปีหน้า", source_reference: null, for_finding: "ตรวจเป้าหมายและเวลา" },
      results: {
        hospital_text: "KPI A", source_reference: "ตารางท้าย SAR", for_finding: "ตรวจนิยาม",
        kpis: [{ name: "KPI A", target: "90%", current: "88%", trend: "คงที่", period: "2568", interpretation: "ต่ำกว่าเป้าหมาย" }],
      },
    }],
    warnings: [], source_references: [],
  };
}

function job(result) {
  return {
    id: "12345678-1234-4123-8123-123456789abc",
    standard_code: "II-3",
    standard_title: result.standard_title,
    result,
    created_at: "2026-08-27T00:00:00Z",
    updated_at: "2026-08-27T00:00:00Z",
  };
}

test("For Finding headings keep the confirmed order", () => {
  const sections = findingSections(fixture("มีความก้าวหน้า").subchapters[0].development.for_finding);
  assert.deepEqual(sections.map(([label]) => label), [
    "ความสอดคล้องกับบริบทและข้อกำหนด",
    "ผลการพัฒนาเชื่อมโยงกับตัวชี้วัด",
    "ข้อเสนอแนะ/คำแนะนำครั้งที่ผ่านมาและความก้าวหน้า",
    "ประเด็นค้นหาต่อ",
  ]);
});

test("prior recommendation heading is omitted without a prior report", () => {
  const sections = findingSections(fixture().subchapters[0].development.for_finding);
  assert.equal(sections.length, 3);
  assert.ok(!sections.some(([label]) => label.includes("ครั้งที่ผ่านมา")));
});

test("report generator creates Word and PDF and merges the subchapter cell", async () => {
  const files = await buildReportFiles(job(fixture("มีความก้าวหน้า")));
  assert.equal(files.docx.buffer.subarray(0, 2).toString(), "PK");
  assert.equal(files.pdf.buffer.subarray(0, 4).toString(), "%PDF");
  assert.match(files.docx.name, /\.docx$/);
  assert.match(files.pdf.name, /\.pdf$/);
  const zip = await JSZip.loadAsync(files.docx.buffer);
  const xml = await zip.file("word/document.xml").async("string");
  assert.match(xml, /w:vMerge w:val="restart"/);
  assert.match(xml, /w:vMerge w:val="continue"/);
  assert.match(xml, /Self Score/);
  assert.match(xml, /AI-Assisted Score/);
  assert.match(xml, /Browallia New/);
  assert.match(xml, /II – 3 สิ่งแวดล้อมในการดูแลผู้ป่วย\/ผู้รับผลงาน/);
});

test("PDF generator is wired to all four Browallia New faces", async () => {
  const source = await readFile(new URL("../src/report-files.js", import.meta.url), "utf8");
  for (const face of ["Regular", "Bold", "Italic", "BoldItalic"]) {
    assert.match(source, new RegExp(`BrowalliaNew-${face}\\.ttf`));
  }
});

test("PDF table fits inside A3 landscape with normal one-inch margins", () => {
  const a3LandscapeWidth = 1190.55;
  const availableWidth = a3LandscapeWidth - PDF_PAGE_MARGINS[0] - PDF_PAGE_MARGINS[2];
  const cellPadding = 8 * PDF_WIDTHS.length;
  const borders = 0.45 * (PDF_WIDTHS.length + 1);
  const renderedTableWidth = PDF_WIDTHS.reduce((sum, width) => sum + width, 0) + cellPadding + borders;

  assert.deepEqual(PDF_PAGE_MARGINS, [72, 72, 72, 72]);
  assert.ok(renderedTableWidth <= availableWidth);
});

test("submitted page never exposes the analysis", () => {
  const html = submittedPage(job(fixture()));
  assert.match(html, /PDF และ Word ทางอีเมลเท่านั้น/);
  assert.match(html, /20–30 นาที/);
  assert.match(html, /อย่ากดส่งมาตรฐานเดิมซ้ำ/);
  assert.match(html, /ส่งมาตรฐานอื่น/);
  assert.match(html, /หน้าเว็บนี้จะไม่แสดงผลการวิเคราะห์/);
  assert.doesNotMatch(html, /บริบทโรงพยาบาล/);
  assert.doesNotMatch(html, /\/result\//);
});

test("web app has no route that serves a completed analysis", async () => {
  const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /app\.get\(["']\/result\//);
  assert.doesNotMatch(source, /completedPage|pendingPage/);
});
