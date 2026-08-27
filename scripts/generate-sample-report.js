import { mkdir, writeFile } from "node:fs/promises";
import { buildReportFiles } from "../src/report-files.js";

const baseFinding = {
  context_requirement_alignment: "บริบทระบุความเสี่ยงด้านอาคารและสิ่งแวดล้อม แต่ควรยืนยันว่าการจัดลำดับความสำคัญครอบคลุมพื้นที่เสี่ยงสูงและบริการสำคัญของโรงพยาบาล",
  development_indicator_linkage: "ผลการพัฒนากล่าวถึงการแก้ไขระบบ แต่ความเชื่อมโยงกับผลตัวชี้วัดก่อนและหลังดำเนินการยังไม่ชัดเจน",
  prior_recommendation_progress: "มีการจัดทำแผนตอบข้อเสนอแนะครั้งก่อนแล้ว ควรขอดูสถานะรายกิจกรรม ผู้รับผิดชอบ กำหนดเวลา และหลักฐานปิดประเด็น",
  further_finding: "ขอดูทะเบียนความเสี่ยง แผนบำรุงรักษา ผลตรวจพื้นที่ สัมภาษณ์ผู้ปฏิบัติ และตามรอยจากจุดเสี่ยงไปถึงการแก้ไขและการติดตามผล",
};

const chapter = (code, title, index) => ({
  code,
  title,
  development: {
    hospital_text: "โรงพยาบาลทบทวนความเสี่ยงในพื้นที่บริการ ปรับปรุงเส้นทางสัญจร ระบบแจ้งเหตุ และแผนบำรุงรักษาเชิงป้องกัน พร้อมสื่อสารแนวทางแก่หน่วยงานที่เกี่ยวข้อง โดยมีการตรวจติดตามร่วมกับทีมสหสาขาและนำประเด็นจากการตรวจเยี่ยมมาจัดลำดับเพื่อดำเนินการ",
    source_reference: `SAR หน้า ${index + 1}`,
    self_score: 3,
    ai_assisted_score: 3,
    score_rationale: "มีภาพรวมของการนำระบบไปปฏิบัติและใช้ข้อมูลติดตาม แต่ยังต้องยืนยันความครอบคลุมและผลลัพธ์จริงก่อนพิจารณาระดับที่สูงขึ้น",
    for_finding: { ...baseFinding },
  },
  development_plan: {
    hospital_text: "พัฒนาระบบติดตามงานแก้ไขให้เห็นสถานะรายพื้นที่ กำหนดเจ้าภาพและระยะเวลา รวมทั้งเชื่อมข้อมูลความเสี่ยงกับแผนลงทุนประจำปี",
    source_reference: `SAR หน้า ${index + 2}`,
    for_finding: "ขอรายละเอียด baseline เป้าหมาย ระยะเวลา ผู้รับผิดชอบ ทรัพยากร และเกณฑ์ประเมินความสำเร็จของแต่ละกิจกรรม",
  },
  results: {
    hospital_text: "โรงพยาบาลรายงานตัวชี้วัดด้านการตรวจพื้นที่และการปิดประเด็นความเสี่ยง",
    source_reference: "ตารางตัวชี้วัดท้าย SAR",
    for_finding: "ตัวชี้วัดการปิดประเด็นยังต่ำกว่าเป้าหมาย ควรขอดูการวิเคราะห์สาเหตุ แผนแก้ไข และแนวโน้มรายไตรมาสที่ใช้ตัดสินประสิทธิผล",
    kpis: [
      { name: "ร้อยละพื้นที่ผ่านเกณฑ์การตรวจความปลอดภัย", target: "≥ 95%", current: "93%", trend: "ดีขึ้น", period: "ไตรมาส 4/2568", interpretation: "ดีขึ้นแต่ยังต่ำกว่าเป้าหมาย" },
      { name: "ร้อยละประเด็นความเสี่ยงที่ปิดภายในกำหนด", target: "≥ 90%", current: "82%", trend: "คงที่", period: "ปี 2568", interpretation: "ต่ำกว่าเป้าหมายและควรเร่งวิเคราะห์สาเหตุ" },
    ],
  },
});

const review = {
  standard_code: "II-3",
  standard_title: "สิ่งแวดล้อมในการดูแลผู้ป่วย/ผู้รับผลงาน",
  major_context: {
    hospital_text: "โรงพยาบาลเป็นโรงพยาบาลทั่วไปที่มีอาคารหลายช่วงอายุและมีการขยายบริการผู้ป่วยนอก ความเสี่ยงสำคัญคือความแออัด ระบบสาธารณูปโภคเดิม พื้นที่ควบคุมการติดเชื้อ และความพร้อมต่อภาวะฉุกเฉิน จึงให้ความสำคัญกับการบริหารสิ่งแวดล้อมแบบบูรณาการและการติดตามผลจากพื้นที่จริง",
    source_reference: "SAR หน้า 1",
  },
  subchapters: [
    chapter("II-3.1", "สิ่งแวดล้อมทางกายภาพและความปลอดภัย", 1),
    chapter("II-3.2", "เครื่องมือและระบบสาธารณูปโภค", 4),
    chapter("II-3.3", "สิ่งแวดล้อมเพื่อการสร้างเสริมสุขภาพและการพิทักษ์สิ่งแวดล้อม", 7),
  ],
  warnings: ["ตัวอย่างนี้เป็นข้อมูลสังเคราะห์สำหรับตรวจรูปแบบเอกสารเท่านั้น", "คะแนนต้องยืนยันด้วยหลักฐานจริงในการเยี่ยมสำรวจ"],
  source_references: [],
};

const job = {
  id: "12345678-1234-4123-8123-123456789abc",
  standard_code: review.standard_code,
  standard_title: review.standard_title,
  created_at: "2026-08-27T00:00:00Z",
  updated_at: "2026-08-27T00:00:00Z",
};

const files = await buildReportFiles(job, review);
const output = new URL("../tmp/qa/", import.meta.url);
await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(new URL(files.docx.name, output), files.docx.buffer),
  writeFile(new URL(files.pdf.name, output), files.pdf.buffer),
]);
console.log(new URL(files.docx.name, output).pathname);
console.log(new URL(files.pdf.name, output).pathname);
