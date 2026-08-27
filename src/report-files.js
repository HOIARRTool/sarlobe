import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
} from "docx";
import PdfPrinter from "pdfmake";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
const FONT_NAME = "Sarabun";
const COLORS = {
  ink: "18332E",
  teal: "0B6B5E",
  tealDark: "06483F",
  mint: "DCEBE4",
  cream: "F4EAD0",
  pale: "EEF7F3",
  white: "FFFFFF",
  line: "9EAAA6",
  muted: "60746F",
  gold: "D7A52C",
  warning: "FFF9E9",
};
const DOCX_WIDTHS = [2963, 2735, 5470, 1367, 1823, 8433];
// A3 landscape is 1190.55 pt wide. These content widths, together with the
// cell padding and borders, stay inside one-inch ("Normal") page margins.
export const PDF_PAGE_MARGINS = Object.freeze([72, 72, 72, 72]);
export const PDF_WIDTHS = Object.freeze([130, 112, 286, 52, 74, 336]);
const DOCX_FONT = { ascii: FONT_NAME, hAnsi: FONT_NAME, eastAsia: FONT_NAME, cs: FONT_NAME };

function thaiDate(value) {
  return new Date(value || Date.now()).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function safeText(value) {
  return String(value ?? "").trim();
}

function fileDate(value) {
  const date = new Date(value || Date.now());
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function reportFileNames(job) {
  const stem = `HA-SAR-${String(job.standard_code).replaceAll(/[^A-Za-z0-9.-]/g, "-")}-${fileDate(job.created_at)}-${job.id.slice(0, 8)}`;
  return { docx: `${stem}.docx`, pdf: `${stem}.pdf` };
}

function docxRuns(value, options = {}) {
  const lines = safeText(value).split("\n");
  return lines.map((line, index) => new TextRun({
    text: line || " ",
    break: index ? 1 : 0,
    font: DOCX_FONT,
    size: options.size || 18,
    sizeComplexScript: options.size || 18,
    bold: options.bold || false,
    boldComplexScript: options.bold || false,
    color: options.color || COLORS.ink,
    language: { value: "th-TH", eastAsia: "th-TH" },
  }));
}

function docxParagraph(value, options = {}) {
  return new Paragraph({
    children: docxRuns(value, options),
    alignment: options.alignment || AlignmentType.LEFT,
    spacing: { before: options.before || 0, after: options.after ?? 70, line: options.line || 260 },
    keepNext: options.keepNext || false,
  });
}

function docxSource(source) {
  if (!safeText(source)) return [];
  return [docxParagraph(`แหล่ง: ${source}`, { size: 15, color: COLORS.muted, before: 40, after: 0, line: 220 })];
}

function docxRecord(text, source) {
  return [docxParagraph(text || "ไม่ได้ระบุ", { after: 30 }), ...docxSource(source)];
}

function docxKpiRecord(results) {
  const children = [];
  if (safeText(results.hospital_text)) children.push(docxParagraph(results.hospital_text, { after: 55 }));
  for (const [index, kpi] of (results.kpis || []).entries()) {
    children.push(docxParagraph(`KPI ${index + 1}: ${kpi.name}`, { bold: true, color: COLORS.tealDark, after: 20 }));
    children.push(docxParagraph(
      `เป้าหมาย: ${kpi.target || "ไม่ระบุ"} | ผลปัจจุบัน: ${kpi.current || "ไม่ระบุ"}\nแนวโน้ม: ${kpi.trend || "ไม่ระบุ"} | ช่วงเวลา: ${kpi.period || "ไม่ระบุ"}\nความหมาย: ${kpi.interpretation || "ไม่ระบุ"}`,
      { size: 16, after: 50, line: 225 },
    ));
  }
  if (!children.length) children.push(docxParagraph("ไม่ได้ระบุ"));
  children.push(...docxSource(results.source_reference));
  return children;
}

export function findingSections(finding) {
  const sections = [
    ["ความสอดคล้องกับบริบทและข้อกำหนด", finding.context_requirement_alignment],
    ["ผลการพัฒนาเชื่อมโยงกับตัวชี้วัด", finding.development_indicator_linkage],
  ];
  if (safeText(finding.prior_recommendation_progress)) {
    sections.push(["ข้อเสนอแนะ/คำแนะนำครั้งที่ผ่านมาและความก้าวหน้า", finding.prior_recommendation_progress]);
  }
  sections.push(["ประเด็นค้นหาต่อ", finding.further_finding]);
  return sections;
}

function docxFinding(finding) {
  return findingSections(finding).flatMap(([label, text], index) => [
    docxParagraph(`${label}:`, { bold: true, color: COLORS.tealDark, before: index ? 50 : 0, after: 15 }),
    docxParagraph(text || "ไม่ได้ระบุ", { after: 25 }),
  ]);
}

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COLORS.line },
};

function docxCell(children, width, options = {}) {
  return new TableCell({
    children: children.length ? children : [docxParagraph("")],
    width: { size: width, type: WidthType.DXA },
    verticalAlign: options.verticalAlign || VerticalAlign.TOP,
    verticalMerge: options.verticalMerge,
    shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 95, right: 95 },
    borders: tableBorders,
  });
}

function docxScore(value, width, fill = null, rationale = "") {
  const children = [docxParagraph(value ?? "", {
    bold: true,
    size: 26,
    alignment: AlignmentType.CENTER,
    color: fill ? COLORS.tealDark : COLORS.ink,
    after: rationale ? 25 : 0,
  })];
  if (safeText(rationale)) children.push(docxParagraph(rationale, { size: 14, color: COLORS.muted, after: 0, line: 210 }));
  return docxCell(children, width, { fill, verticalAlign: VerticalAlign.CENTER });
}

function docxHeaderRow() {
  const labels = ["มาตรฐาน", "องค์ประกอบ SAR", "รายละเอียดที่โรงพยาบาลบันทึก", "Self Score", "AI-Assisted Score", "For Finding"];
  return new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: labels.map((label, index) => docxCell(
      [docxParagraph(label, { bold: true, color: COLORS.white, alignment: AlignmentType.CENTER, after: 0 })],
      DOCX_WIDTHS[index],
      { fill: COLORS.tealDark, verticalAlign: VerticalAlign.CENTER },
    )),
  });
}

function docxRows(review) {
  const rows = [new TableRow({
    children: [
      docxCell([docxParagraph(`${review.standard_code} ${review.standard_title}`, { bold: true, after: 0 })], DOCX_WIDTHS[0], { fill: COLORS.cream }),
      docxCell([docxParagraph("(i) บริบท", { bold: true, after: 0 })], DOCX_WIDTHS[1], { fill: COLORS.cream }),
      docxCell(docxRecord(review.major_context.hospital_text, review.major_context.source_reference), DOCX_WIDTHS[2], { fill: COLORS.cream }),
      docxCell([], DOCX_WIDTHS[3], { fill: COLORS.cream }),
      docxCell([], DOCX_WIDTHS[4], { fill: COLORS.cream }),
      docxCell([], DOCX_WIDTHS[5], { fill: COLORS.cream }),
    ],
  })];

  for (const chapter of review.subchapters) {
    rows.push(new TableRow({ children: [
      docxCell([docxParagraph(`${chapter.code} ${chapter.title}`, { bold: true, after: 0 })], DOCX_WIDTHS[0], { fill: COLORS.mint, verticalMerge: VerticalMergeType.RESTART }),
      docxCell([docxParagraph("(ii) ผลการพัฒนาที่ได้ดำเนินการ", { bold: true, after: 0 })], DOCX_WIDTHS[1]),
      docxCell(docxRecord(chapter.development.hospital_text, chapter.development.source_reference), DOCX_WIDTHS[2]),
      docxScore(chapter.development.self_score, DOCX_WIDTHS[3]),
      docxScore(chapter.development.ai_assisted_score, DOCX_WIDTHS[4], COLORS.pale, chapter.development.score_rationale),
      docxCell(docxFinding(chapter.development.for_finding), DOCX_WIDTHS[5]),
    ] }));
    rows.push(new TableRow({ children: [
      docxCell([], DOCX_WIDTHS[0], { fill: COLORS.mint, verticalMerge: VerticalMergeType.CONTINUE }),
      docxCell([docxParagraph("(iii) แผนการพัฒนา", { bold: true, after: 0 })], DOCX_WIDTHS[1]),
      docxCell(docxRecord(chapter.development_plan.hospital_text, chapter.development_plan.source_reference), DOCX_WIDTHS[2]),
      docxCell([], DOCX_WIDTHS[3]),
      docxCell([], DOCX_WIDTHS[4]),
      docxCell([docxParagraph(chapter.development_plan.for_finding || "ไม่ได้ระบุ", { after: 0 })], DOCX_WIDTHS[5]),
    ] }));
    rows.push(new TableRow({ children: [
      docxCell([], DOCX_WIDTHS[0], { fill: COLORS.mint, verticalMerge: VerticalMergeType.CONTINUE }),
      docxCell([docxParagraph("(iv) ผลการดำเนินการ", { bold: true, after: 0 })], DOCX_WIDTHS[1]),
      docxCell(docxKpiRecord(chapter.results), DOCX_WIDTHS[2]),
      docxCell([], DOCX_WIDTHS[3]),
      docxCell([], DOCX_WIDTHS[4]),
      docxCell([docxParagraph(chapter.results.for_finding || "ไม่ได้ระบุ", { after: 0 })], DOCX_WIDTHS[5]),
    ] }));
  }
  return rows;
}

async function buildDocx(job, review) {
  const warnings = review.warnings?.length
    ? [
        docxParagraph("ข้อควรระวังในการใช้ผล", { bold: true, color: COLORS.tealDark, before: 120, after: 40, keepNext: true }),
        ...review.warnings.map((warning) => docxParagraph(`• ${warning}`, { size: 17, after: 25 })),
      ]
    : [];
  const document = new Document({
    creator: "HA6 SAR Reviewer",
    title: `AI-assisted SAR review ${job.standard_code}`,
    description: "ผลการทบทวน SAR ด้วย AI ตามเทมเพลต SAR Lobe",
    styles: {
      default: {
        document: {
          run: { font: DOCX_FONT, size: 18, sizeComplexScript: 18, color: COLORS.ink, language: { value: "th-TH", eastAsia: "th-TH" } },
          paragraph: { spacing: { after: 70, line: 260 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 16838, height: 23811, orientation: PageOrientation.LANDSCAPE },
          margin: { top: 510, right: 510, bottom: 620, left: 510, header: 250, footer: 280 },
        },
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "AI-assisted review - ไม่ใช่คำตัดสินอย่างเป็นทางการ | หน้า ", font: DOCX_FONT, size: 14, sizeComplexScript: 14, color: COLORS.muted, language: { value: "th-TH", eastAsia: "th-TH" } }), PageNumber.CURRENT],
        })] }),
      },
      children: [
        docxParagraph("AI-ASSISTED SAR REVIEW", { bold: true, size: 17, color: COLORS.teal, after: 30, keepNext: true }),
        docxParagraph(`${job.standard_code} ${job.standard_title}`, { bold: true, size: 30, color: COLORS.tealDark, after: 25, keepNext: true }),
        docxParagraph(`จัดทำเมื่อ ${thaiDate(job.updated_at || Date.now())} | เลขอ้างอิง ${job.id}`, { size: 16, color: COLORS.muted, after: 100, keepNext: true }),
        new Table({
          rows: [docxHeaderRow(), ...docxRows(review)],
          width: { size: DOCX_WIDTHS.reduce((sum, value) => sum + value, 0), type: WidthType.DXA },
          columnWidths: DOCX_WIDTHS,
          layout: TableLayoutType.FIXED,
          // Named override: the A3 audit matrix uses zero indent to maximize readable width.
          indent: { size: 0, type: WidthType.DXA },
          borders: tableBorders,
        }),
        ...warnings,
        docxParagraph("For Finding คือประเด็นสำหรับขอหลักฐาน สัมภาษณ์ สังเกต หรือตามรอยเพิ่มเติม ไม่ได้หมายถึงข้อบกพร่องที่ยืนยันแล้ว ส่วน AI-Assisted Score ต้องยืนยันด้วยหลักฐานจริง", { size: 16, color: COLORS.muted, before: 100, after: 0 }),
      ],
    }],
  });
  return Packer.toBuffer(document);
}

function pdfText(value, options = {}) {
  return { text: safeText(value) || " ", ...options };
}

function pdfSource(source) {
  return safeText(source) ? { text: `แหล่ง: ${source}`, color: `#${COLORS.muted}`, fontSize: 6.2, margin: [0, 4, 0, 0] } : null;
}

function pdfRecord(text, source) {
  return { stack: [pdfText(text || "ไม่ได้ระบุ"), pdfSource(source)].filter(Boolean) };
}

function pdfKpiRecord(results) {
  const stack = [];
  if (safeText(results.hospital_text)) stack.push(pdfText(results.hospital_text, { margin: [0, 0, 0, 4] }));
  for (const [index, kpi] of (results.kpis || []).entries()) {
    stack.push(pdfText(`KPI ${index + 1}: ${kpi.name}`, { bold: true, color: `#${COLORS.tealDark}`, margin: [0, 3, 0, 1] }));
    stack.push(pdfText(`เป้าหมาย: ${kpi.target || "ไม่ระบุ"} | ผลปัจจุบัน: ${kpi.current || "ไม่ระบุ"}\nแนวโน้ม: ${kpi.trend || "ไม่ระบุ"} | ช่วงเวลา: ${kpi.period || "ไม่ระบุ"}\nความหมาย: ${kpi.interpretation || "ไม่ระบุ"}`, { fontSize: 6.4 }));
  }
  if (!stack.length) stack.push(pdfText("ไม่ได้ระบุ"));
  const source = pdfSource(results.source_reference);
  if (source) stack.push(source);
  return { stack };
}

function pdfFinding(finding) {
  return { stack: findingSections(finding).flatMap(([label, value], index) => [
    pdfText(`${label}:`, { bold: true, color: `#${COLORS.tealDark}`, margin: [0, index ? 4 : 0, 0, 1] }),
    pdfText(value || "ไม่ได้ระบุ"),
  ]) };
}

function pdfRows(review) {
  const rows = [[
    pdfText(`${review.standard_code} ${review.standard_title}`, { bold: true, fillColor: `#${COLORS.cream}` }),
    pdfText("(i) บริบท", { bold: true, fillColor: `#${COLORS.cream}` }),
    { ...pdfRecord(review.major_context.hospital_text, review.major_context.source_reference), fillColor: `#${COLORS.cream}` },
    { text: "", fillColor: `#${COLORS.cream}` },
    { text: "", fillColor: `#${COLORS.cream}` },
    { text: "", fillColor: `#${COLORS.cream}` },
  ]];
  for (const chapter of review.subchapters) {
    rows.push([
      { text: `${chapter.code} ${chapter.title}`, bold: true, rowSpan: 3, fillColor: `#${COLORS.mint}` },
      pdfText("(ii) ผลการพัฒนาที่ได้ดำเนินการ", { bold: true }),
      pdfRecord(chapter.development.hospital_text, chapter.development.source_reference),
      pdfText(chapter.development.self_score ?? "", { bold: true, fontSize: 13, alignment: "center" }),
      { stack: [
        pdfText(chapter.development.ai_assisted_score ?? "", { bold: true, fontSize: 13, alignment: "center", color: `#${COLORS.tealDark}` }),
        pdfText(chapter.development.score_rationale || "", { fontSize: 6.1, color: `#${COLORS.muted}`, margin: [0, 3, 0, 0] }),
      ], fillColor: `#${COLORS.pale}` },
      pdfFinding(chapter.development.for_finding),
    ]);
    rows.push([
      "",
      pdfText("(iii) แผนการพัฒนา", { bold: true }),
      pdfRecord(chapter.development_plan.hospital_text, chapter.development_plan.source_reference),
      "",
      "",
      pdfText(chapter.development_plan.for_finding || "ไม่ได้ระบุ"),
    ]);
    rows.push([
      "",
      pdfText("(iv) ผลการดำเนินการ", { bold: true }),
      pdfKpiRecord(chapter.results),
      "",
      "",
      pdfText(chapter.results.for_finding || "ไม่ได้ระบุ"),
    ]);
  }
  return rows;
}

async function buildPdf(job, review) {
  const regular = fileURLToPath(new URL("../node_modules/@expo-google-fonts/sarabun/400Regular/Sarabun_400Regular.ttf", import.meta.url));
  const bold = fileURLToPath(new URL("../node_modules/@expo-google-fonts/sarabun/700Bold/Sarabun_700Bold.ttf", import.meta.url));
  const printer = new PdfPrinter({ Sarabun: { normal: regular, bold, italics: regular, bolditalics: bold } });
  const header = ["มาตรฐาน", "องค์ประกอบ SAR", "รายละเอียดที่โรงพยาบาลบันทึก", "Self Score", "AI-Assisted Score", "For Finding"]
    .map((text) => ({ text, bold: true, color: "#FFFFFF", fillColor: `#${COLORS.tealDark}`, alignment: "center" }));
  const content = [
    { text: "AI-ASSISTED SAR REVIEW", bold: true, fontSize: 8, color: `#${COLORS.teal}`, characterSpacing: 0.7, margin: [0, 0, 0, 2] },
    { text: `${job.standard_code} ${job.standard_title}`, bold: true, fontSize: 18, color: `#${COLORS.tealDark}`, margin: [0, 0, 0, 2] },
    { text: `จัดทำเมื่อ ${thaiDate(job.updated_at || Date.now())} | เลขอ้างอิง ${job.id}`, fontSize: 7, color: `#${COLORS.muted}`, margin: [0, 0, 0, 8] },
    {
      table: { headerRows: 1, widths: [...PDF_WIDTHS], body: [header, ...pdfRows(review)] },
      layout: {
        hLineWidth: () => 0.45,
        vLineWidth: () => 0.45,
        hLineColor: () => `#${COLORS.line}`,
        vLineColor: () => `#${COLORS.line}`,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
    },
  ];
  if (review.warnings?.length) {
    content.push({ text: "ข้อควรระวังในการใช้ผล", bold: true, color: `#${COLORS.tealDark}`, margin: [0, 9, 0, 2] });
    content.push({ ul: review.warnings, fontSize: 7, color: `#${COLORS.ink}`, margin: [10, 0, 0, 0] });
  }
  content.push({
    text: "For Finding คือประเด็นสำหรับขอหลักฐาน สัมภาษณ์ สังเกต หรือตามรอยเพิ่มเติม ไม่ได้หมายถึงข้อบกพร่องที่ยืนยันแล้ว ส่วน AI-Assisted Score ต้องยืนยันด้วยหลักฐานจริง",
    fontSize: 6.5,
    color: `#${COLORS.muted}`,
    margin: [0, 8, 0, 0],
  });
  const definition = {
    pageSize: "A3",
    pageOrientation: "landscape",
    pageMargins: [...PDF_PAGE_MARGINS],
    defaultStyle: { font: "Sarabun", fontSize: 7.2, color: `#${COLORS.ink}`, lineHeight: 1.2 },
    content,
    footer: (current, total) => ({
      text: `AI-assisted review - ไม่ใช่คำตัดสินอย่างเป็นทางการ | หน้า ${current}/${total}`,
      alignment: "right",
      font: "Sarabun",
      fontSize: 6.5,
      color: `#${COLORS.muted}`,
      margin: [0, 5, PDF_PAGE_MARGINS[2], 0],
    }),
    info: { title: `AI-assisted SAR review ${job.standard_code}`, author: "HA6 SAR Reviewer" },
  };
  const pdf = printer.createPdfKitDocument(definition);
  return new Promise((resolve, reject) => {
    const chunks = [];
    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    pdf.end();
  });
}

export async function buildReportFiles(job, review = job.result) {
  const names = reportFileNames(job);
  const [docx, pdf] = await Promise.all([buildDocx(job, review), buildPdf(job, review)]);
  return {
    docx: { name: names.docx, mimeType: DOCX_MIME, buffer: docx },
    pdf: { name: names.pdf, mimeType: PDF_MIME, buffer: pdf },
  };
}
