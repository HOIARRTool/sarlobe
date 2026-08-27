# AI-Assisted SAR Review Template

Use this reference when reviewing a hospital SAR from a surveyor-minded perspective. The output supports preparation and organizational learning; it is not an official HAI or survey-team judgment. Do not store hospital-specific evidence, recommendations, scores, or results in this skill.

## Required terms

- **Self-assessment:** a faithful, concise summary of `(ii) ผลการพัฒนาที่ได้ดำเนินการ` that the hospital recorded. Do not add model inference or evidence requests to the hospital-text column.
- **Self Score:** the score recorded by the hospital. Leave the cell blank when the hospital did not record a score; never infer it.
- **AI-Assisted Score:** the model's working whole-number score based on the official Scoring Guideline and the chapter/subchapter's overall requirement. Never label it Surveyor Score.
- **For Finding:** matters for further inquiry, verification, interview, observation, tracer, document review, or raw-data review. It is not automatically a confirmed deficiency.

Distinguish an evidence request from a gap. A document or detail not shown in SAR may exist and belongs under `ประเด็นค้นหาต่อ`. Call something a gap when the hospital states that it is absent or incomplete, evidence conflicts, an important process/result is demonstrably uncontrolled, or the omission materially affects the overall requirement. Use `[ต้องยืนยัน]`, `[ข้อมูลขัดแย้ง]`, `[ไม่มีหลักฐานรองรับ]`, and `[ข้อเสนอ ไม่ใช่สิ่งที่ รพ.ทำแล้ว]` when useful.

## Scoring discipline

Read [review-and-scoring.md](review-and-scoring.md) and use its official maturity anchors.

- Score the overall requirement at the appropriate chapter/subchapter unit and use whole numbers 1-5.
- Do not count SPA activities or numbered implementation notes as independent checklist points. Use them to understand intent and formulate For Finding questions.
- Missing detail in SAR does not automatically lower the score.
- A result below target does not automatically force score 2 if important processes are implemented effectively and the organization analyzes and uses the result.
- Calibrate independently from the Self Score. When the AI-Assisted Score is lower, `score_rationale` must name the unmet maturity anchor, the material hospital evidence that constrains the overall requirement, and why the issue is score-limiting rather than only For Finding. If that basis is unavailable, do not lower the score solely from uncertainty.
- For a compound subchapter, group evidence and KPIs by risk domain before scoring. One unfavorable domain or indicator affects the whole score only when it is scope-matched and materially demonstrates unreliable implementation across important areas.
- Distinguish process nonconformity, near miss, and actual harm. Do not infer harm from an incorrect-process indicator without supporting evidence.
- Scores 4-5 require the corresponding maturity in continuous improvement, integration, sustained/comparative results, role-model practice, or impact.
- Calculate the AI-Assisted Score only after reading both `(ii) ผลการพัฒนาที่ได้ดำเนินการ` and the relevant KPI evidence in `(iv) ผลการดำเนินการ`.
- A future plan in `(iii)` cannot justify or inflate the current score.

## Table contract

Use this table structure:

| มาตรฐาน | องค์ประกอบ SAR | รายละเอียดที่โรงพยาบาลบันทึก | Self Score | AI-Assisted Score | For Finding |
|---|---|---|---:|---:|---|

### Grouping and merged cells

- Show the major standard once with row `(i) บริบท`.
- Show each subchapter title once and group or merge it vertically across rows `(ii)`-`(iv)`. In Markdown, leave the repeated standard cells blank; in Word or spreadsheet output, merge the cells when layout permits.
- Leave score cells genuinely blank when no score applies. Do not insert `-`, `—`, `ไม่ระบุ`, or explanatory filler.

## Row rules

### (i) บริบท

Copy or faithfully summarize the hospital's material current conditions, strengths, constraints, problems, risks, and opportunities that affect process design, implementation, or evaluation of success.

- Do not assign Self Score or AI-Assisted Score.
- Do not write For Finding in the context row.
- Use the context as the analytic basis for the first For Finding section in each row `(ii)`.

### (ii) ผลการพัฒนาที่ได้ดำเนินการ

Put the hospital's completed-development narrative in the hospital-text column. This is the only row that displays Self Score and AI-Assisted Score.

The `For Finding` cell must use these headings in this exact order:

1. **ความสอดคล้องกับบริบทและข้อกำหนด:** assess whether the completed development responds to the material context and achieves the overall requirement across important areas. Use detailed standard notes and SPA only as interpretive prompts, not scoring points.
2. **ผลการพัฒนาเชื่อมโยงกับตัวชี้วัด:** link the material development claims to the relevant KPI in row `(iv)` or the result table at the end of the SAR. Examine target, definition, numerator/denominator, period, trend, variation, comparison, and use of the result. Flag claimed improvement without a supporting indicator, important indicators without a related process narrative, and contradictions between narrative and results. Do not imply causation without evidence.
3. **ข้อเสนอแนะ/คำแนะนำครั้งที่ผ่านมาและความก้าวหน้า:** include this heading only when a prior survey report is supplied. Extract only its Recommendation/Suggestion relevant to the subchapter; do not import the prior report's Evidence column into this section. Compare the recommendation with what appears in the current SAR and describe `ความก้าวหน้าที่ปรากฏใน SAR ปัจจุบัน`. Do not call the recommendation closed without verified system change, coverage, and results. If one recommendation spans several subchapters, place it under the most relevant one and avoid unnecessary duplication.
4. **ประเด็นค้นหาต่อ:** state the smallest useful set of evidence, interviews, observations, tracers, or raw data needed to verify implementation, coverage, learning, and results. Include material unresolved gaps or contradictions, but do not convert every SPA prompt or absent document into a gap.

Omit the third heading entirely when there is no applicable prior survey report or recommendation. Do not renumber or reorder the remaining headings.

### (iii) แผนการพัฒนา

Put the hospital-written plan in its own row. Do not place the plan inside the For Finding cell of row `(ii)`.

- Leave Self Score and AI-Assisted Score blank.
- In For Finding, assess whether the plan arises from material context, the overall requirement, a demonstrated gap or risk, incomplete coverage, an underperforming or variable result, a prior recommendation, or the next maturity step.
- Check what will change, why, intended result, measure of success, owner, timeframe, resources, and interim risk control.
- Separate the hospital's plan from an AI recommendation. Do not use the plan to justify the current AI-Assisted Score.

### (iv) ผลการดำเนินการ

Place the relevant hospital KPI and results in their own row, mapped to the subchapter even when the source SAR presents one combined result table at the end.

- Leave Self Score and AI-Assisted Score blank.
- Analyze achievement against target, multi-year trend, definition, denominator, period, variation, comparison, data quality, and consistency with the narrative.
- When a KPI is below target, worsening, missing for a material context risk, or internally inconsistent, state the issue in this row's For Finding and feed it back into `ผลการพัฒนาเชื่อมโยงกับตัวชี้วัด` and the AI-Assisted Score in row `(ii)`.
- Before using an adverse KPI to lower the score, check its definition, scope match, denominator or exposure, severity, unit/time distribution, recurrence, reporting and detection culture, corrective action, and use for learning. A below-target value may remain For Finding when its material effect on overall process maturity is not established.
- Treat activity counts as process controls unless they genuinely demonstrate an outcome.
- For safety-event counts, check reporting culture, denominator, severity, detection, review completeness, and learning before interpreting direction.

## Result-linkage rules

- Read the complete result table, not only indicators placed next to the subchapter narrative.
- Map each indicator to the process or development it is intended to validate.
- Identify material context risks that lack a useful measure and measures that do not support a meaningful claim.
- Reconcile totals, categories, periods, units, targets, and narrative claims. Mark unresolved inconsistencies `[ข้อมูลขัดแย้ง]`.
- Avoid repeating the same KPI finding in several subchapters unless the result materially informs each requirement; otherwise place it under the primary subchapter and cross-reference briefly.

## Completion check

Before finalizing, confirm that:

- the major-standard context appears once in row `(i)` with blank score and For Finding cells;
- each subchapter title appears once and groups rows `(ii)`-`(iv)`;
- only row `(ii)` displays Self Score and AI-Assisted Score;
- row `(ii)` uses the required For Finding heading order;
- completed developments are explicitly linked to the hospital's KPI;
- prior survey recommendations are included only when supplied, and progress is not confused with verified closure;
- row `(iii)` reviews the hospital-written plan separately and does not inflate the current score;
- row `(iv)` analyzes KPI and feeds material result issues back into row `(ii)`;
- any AI-Assisted Score below the Self Score has passed the score-change gate and states the exact score-limiting maturity constraint;
- evidence requests are distinguished from confirmed gaps;
- page, section, table, or dataset traceability is preserved when available;
- the output contains no hospital practice, result, recommendation, or score-supporting fact invented by the model.
