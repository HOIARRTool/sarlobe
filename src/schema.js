const nullableString = { type: ["string", "null"] };
const score = { type: ["integer", "null"], minimum: 1, maximum: 5 };

export const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "standard_code",
    "standard_title",
    "major_context",
    "subchapters",
    "warnings",
    "source_references",
  ],
  properties: {
    standard_code: { type: "string" },
    standard_title: { type: "string" },
    major_context: {
      type: "object",
      additionalProperties: false,
      required: ["hospital_text", "source_reference"],
      properties: {
        hospital_text: { type: "string" },
        source_reference: nullableString,
      },
    },
    subchapters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "title", "development", "development_plan", "results"],
        properties: {
          code: { type: "string" },
          title: { type: "string" },
          development: {
            type: "object",
            additionalProperties: false,
            required: [
              "hospital_text",
              "source_reference",
              "self_score",
              "ai_assisted_score",
              "score_rationale",
              "for_finding",
            ],
            properties: {
              hospital_text: { type: "string" },
              source_reference: nullableString,
              self_score: score,
              ai_assisted_score: score,
              score_rationale: { type: "string" },
              for_finding: {
                type: "object",
                additionalProperties: false,
                required: [
                  "context_requirement_alignment",
                  "development_indicator_linkage",
                  "prior_recommendation_progress",
                  "further_finding",
                ],
                properties: {
                  context_requirement_alignment: { type: "string" },
                  development_indicator_linkage: { type: "string" },
                  prior_recommendation_progress: nullableString,
                  further_finding: { type: "string" },
                },
              },
            },
          },
          development_plan: {
            type: "object",
            additionalProperties: false,
            required: ["hospital_text", "source_reference", "for_finding"],
            properties: {
              hospital_text: { type: "string" },
              source_reference: nullableString,
              for_finding: { type: "string" },
            },
          },
          results: {
            type: "object",
            additionalProperties: false,
            required: ["hospital_text", "source_reference", "kpis", "for_finding"],
            properties: {
              hospital_text: { type: "string" },
              source_reference: nullableString,
              kpis: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "target", "current", "trend", "period", "interpretation"],
                  properties: {
                    name: { type: "string" },
                    target: nullableString,
                    current: nullableString,
                    trend: nullableString,
                    period: nullableString,
                    interpretation: { type: "string" },
                  },
                },
              },
              for_finding: { type: "string" },
            },
          },
        },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
    source_references: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "source"],
        properties: {
          claim: { type: "string" },
          source: { type: "string" },
        },
      },
    },
  },
};

export const REQUIRED_FINDING_ORDER = [
  "ความสอดคล้องกับบริบทและข้อกำหนด",
  "ผลการพัฒนาเชื่อมโยงกับตัวชี้วัด",
  "ข้อเสนอแนะ/คำแนะนำครั้งที่ผ่านมาและความก้าวหน้า",
  "ประเด็นค้นหาต่อ",
];
