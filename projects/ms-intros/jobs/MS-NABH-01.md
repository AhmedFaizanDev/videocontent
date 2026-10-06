# Job MS-NABH-01
Run as ONE Sonnet subagent: read nothing else.  Write the final JSON to `projects/ms-intros/specs/MS-NABH-01.json` (one Write), and stop.

## System
# Course introduction brief (1–1.5 min promo, one per course)

You write ONE course introduction video script for MedSkills, as JSON matching the schema. It is a
short promotional voice-over, professional and warm (Indian English, British spelling), shown over
animated branded screens. The pipeline adds the logo intro and the end card (logo + website).

## Source of truth
The COURSE ROW in the input is the only source of facts: name, learning hours, descriptions,
objectives, learning outcomes, who can take it. Never add facts it does not state — no module
counts, no regulations, no audiences, no numbers that are not in the row.

## Structure (the client's template — follow it exactly, in this order)
1. **Welcome + what and why** — the narration's FIRST sentence is exactly the OPENING given in
   the input. Then one or two sentences on what the course is and why it matters (from the
   descriptions).
2. **What you will learn** — the course objectives, spoken naturally as a journey.
3. **What you will be able to do** — the learning outcomes, and the learning hours.
4. **Who it is for** — who can take the course, and how it helps them. End this scene with an
   invitation to enroll: "Enroll in the short-term course on <the spoken course name> now." (you
   may add a short warm clause, e.g. "…now, and take the next step towards safer care.").
Never say the website, the price or "MedSkills dot in" — the end card shows the website.

## Length — a hard cap
Total narration 140–160 words (≈ 1:20 with the logo and end card; the video must not exceed
1:30). Scene 1 25–40 words, scenes 2–4 35–45 words each.

## Screens (use exactly these)
1. `{type: "opener", kicker: "Welcome", title: <the course name as written in the row>, narration}`
2. `{type: "play", play: "flow.chain", kicker: "What you will learn", narration, mermaid}` —
   `flowchart LR` with exactly 4 nodes, one per objective, each a 2–5 word label (≤ 32 chars),
   `A[...] --> B[...] --> C[...] --> D[...]`, tones `:::teal` on the last. Narrate the objectives
   in node order; each node's label must contain a word the narration speaks for it.
3. `{type: "scene", kicker: "What you will be able to do", narration, elements: [
     {id: "hours", kind: "stat", value: <learning hours>, display: "<hours> hours", label: "of learning", tone: "teal", say: ["<hours word as spoken>"]},
     {id: "outcomes", kind: "stack", items: [4 × {label: ≤ 40 chars}]}]}` —
   one item per learning outcome, in order; narrate them in order; say the hours.
4. `{type: "scene", kicker: "Who it is for", narration, elements: [
     {id: "who", kind: "hub", center: "Who it's for", items: [3–6 × {label: ≤ 22 chars}]}]}` —
   the audience groups from the row (merge similar roles), in the order narrated.

## Language rules
- No abbreviations in narration: say the full forms (FULL FORMS are listed); the screen labels
  may use abbreviations. Numbers as digits.
- Each on-screen item must have a distinctive word that the narration speaks, in order.
- No filler ("in this video"), no hype, no exclamation marks.

## Output
JSON only: `{id, title, outputFilename, module, scenes: [4 scenes as above]}`.


## Schema
```json
{"type":"object","additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":12},"title":{"type":"string","minLength":1,"maxLength":80},"outputFilename":{"type":"string","pattern":"^[A-Za-z0-9_.-]+\\.mp4$"},"module":{"type":"string","minLength":1,"maxLength":60},"scenes":{"type":"array","minItems":4,"maxItems":12,"items":{"anyOf":[{"type":"object","additionalProperties":false,"properties":{"type":{"const":"opener"},"kicker":{"type":"string","minLength":1,"maxLength":28},"narration":{"type":"string","minLength":1,"maxLength":1200},"title":{"type":"string","minLength":1,"maxLength":60},"art":{"type":"string","minLength":1,"maxLength":40},"act":{"type":"array","items":{"type":"string","minLength":1,"maxLength":30}}},"required":["type","kicker","narration","title"]},{"type":"object","additionalProperties":false,"properties":{"type":{"const":"explain"},"kicker":{"type":"string","minLength":1,"maxLength":28},"narration":{"type":"string","minLength":1,"maxLength":1200},"art":{"type":"string","minLength":1,"maxLength":40},"data":{"type":"object"},"points":{"type":"array","minItems":1,"maxItems":8,"items":{"type":"object","additionalProperties":false,"properties":{"on":{"type":"string","minLength":1,"maxLength":30},"label":{"type":"string","minLength":1,"maxLength":28},"act":{"type":"string","minLength":1,"maxLength":30},"note":{"type":"string","minLength":1,"maxLength":90},"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3},"zoom":{"anyOf":[{"type":"number"},{"const":false}]}}}}},"required":["type","kicker","narration","art","points"]},{"type":"object","additionalProperties":false,"properties":{"type":{"const":"flow"},"kicker":{"type":"string","minLength":1,"maxLength":28},"narration":{"type":"string","minLength":1,"maxLength":1200},"mermaid":{"type":"string","minLength":1,"maxLength":900},"tour":{"type":"boolean"},"steps":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"show":{"type":"array","items":{"type":"string","minLength":1,"maxLength":12}},"focus":{"type":"string","minLength":1,"maxLength":12},"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3}}}},"notes":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3},"note":{"type":"string","minLength":1,"maxLength":90}},"required":["say","note"]}}},"required":["type","kicker","narration","mermaid"]},{"type":"object","additionalProperties":false,"properties":{"type":{"const":"table"},"kicker":{"type":"string","minLength":1,"maxLength":28},"narration":{"type":"string","minLength":1,"maxLength":1200},"columns":{"type":"array","minItems":2,"maxItems":4,"items":{"type":"string","maxLength":40}},"rows":{"type":"array","minItems":2,"maxItems":6,"items":{"type":"array","items":{"type":"string","maxLength":60}}},"say":{"type":"array","items":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3}},"bars":{"type":"array","items":{"type":"integer"}},"highlight":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3},"col":{"type":"integer"}},"required":["say","col"]}},"notes":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3},"note":{"type":"string","minLength":1,"maxLength":90}},"required":["say","note"]}}},"required":["type","kicker","narration","columns","rows"]},{"type":"object","additionalProperties":false,"properties":{"type":{"const":"play"},"kicker":{"type":"string","minLength":1,"maxLength":28},"narration":{"type":"string","minLength":1,"maxLength":1200},"play":{"enum":["heart.beat","heart.failure","heart.compressions","heart.recovery","heart.conduction","heart.cycle","heart.coronary","heart.anatomy","flexibleEndoscope.anatomy","flexibleEndoscope.channelPath","flexibleEndoscope.reprocessingPoints","channelCutaway.channels","channelCutaway.biofilm","channelCutaway.brushing","dryingCabinet.storage","dryingCabinet.drying","duodenoscopeTip.anatomy","duodenoscopeTip.outbreak","endoscopeReprocessor.connect","endoscopeReprocessor.cycle","leakTest.setup","leakTest.breach","flow.decision","flow.chain","flow.cause","table.compare","table.scale","table.update"]},"title":{"type":"string","minLength":1,"maxLength":60},"cues":{"type":"object","additionalProperties":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3}},"skip":{"type":"array","items":{"type":"string","minLength":1,"maxLength":20}},"notes":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3},"note":{"type":"string","minLength":1,"maxLength":90}},"required":["say","note"]}},"mermaid":{"type":"string","minLength":1,"maxLength":900},"steps":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"show":{"type":"array","items":{"type":"string","minLength":1,"maxLength":12}},"focus":{"type":"string","minLength":1,"maxLength":12},"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3}}}},"columns":{"type":"array","minItems":2,"maxItems":4,"items":{"type":"string","maxLength":40}},"rows":{"type":"array","minItems":2,"maxItems":6,"items":{"type":"array","items":{"type":"string","maxLength":60}}},"say":{"type":"array","items":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3}},"bars":{"type":"array","items":{"type":"integer"}},"highlight":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3},"col":{"type":"integer"}},"required":["say","col"]}},"widths":{"type":"array","items":{"type":"number"}}},"required":["type","kicker","narration","play"]},{"type":"object","additionalProperties":false,"properties":{"type":{"const":"scene"},"kicker":{"type":"string","minLength":1,"maxLength":28},"narration":{"type":"string","minLength":1,"maxLength":1200},"layout":{"enum":["auto","halves","main"]},"elements":{"type":"array","minItems":1,"maxItems":3,"items":{"type":"object","additionalProperties":false,"properties":{"id":{"type":"string","pattern":"^[a-z][a-zA-Z0-9]{0,15}$"},"kind":{"enum":["art","flow","table","stat","bars","timeline","cycle","hub","stack"]},"art":{"type":"string","minLength":1,"maxLength":40},"data":{"type":"object"},"mermaid":{"type":"string","minLength":1,"maxLength":900},"columns":{"type":"array","minItems":2,"maxItems":4,"items":{"type":"string","maxLength":40}},"rows":{"type":"array","minItems":2,"maxItems":6,"items":{"type":"array","items":{"type":"string","maxLength":60}}},"bars":{"type":"array","items":{"type":"integer"}},"value":{"type":"number"},"of":{"type":"integer"},"display":{"type":"string","minLength":1,"maxLength":12},"label":{"type":"string","minLength":1,"maxLength":48},"tone":{"enum":["red","blue","teal","green","ink"]},"unit":{"type":"string","minLength":1,"maxLength":16},"center":{"type":"string","minLength":1,"maxLength":22},"items":{"type":"array","minItems":2,"maxItems":8,"items":{"type":"object","additionalProperties":false,"properties":{"label":{"type":"string","minLength":1,"maxLength":30},"note":{"type":"string","minLength":1,"maxLength":90},"when":{"type":"string","minLength":1,"maxLength":12},"value":{"type":"number"},"display":{"type":"string","minLength":1,"maxLength":12},"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3}},"required":["label"]}},"say":{"anyOf":[{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3},{"type":"array","items":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3}}]}},"required":["id","kind"]}},"moves":{"type":"array","maxItems":8,"items":{"type":"object","additionalProperties":false,"properties":{"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3},"reveal":{"anyOf":[{"type":"string","minLength":1,"maxLength":16},{"type":"array","items":{"type":"string","minLength":1,"maxLength":16}}]},"focus":{"type":"string","minLength":1,"maxLength":40},"zoom":{"type":"number"},"back":{"type":"boolean"},"label":{"type":"object","additionalProperties":false,"properties":{"on":{"type":"string","minLength":1,"maxLength":40},"text":{"type":"string","minLength":1,"maxLength":28}},"required":["on","text"]},"act":{"anyOf":[{"type":"string","minLength":1,"maxLength":40},{"type":"array","items":{"type":"string","minLength":1,"maxLength":40}}]},"note":{"type":"string","minLength":1,"maxLength":90},"pulse":{"type":"string","minLength":1,"maxLength":40}}}}},"required":["type","kicker","narration","elements"]},{"type":"object","additionalProperties":false,"properties":{"type":{"const":"summary"},"kicker":{"type":"string","minLength":1,"maxLength":28},"narration":{"type":"string","minLength":1,"maxLength":1200},"art":{"type":"string","minLength":1,"maxLength":40},"act":{"type":"array","items":{"type":"string","minLength":1,"maxLength":30}},"notes":{"type":"array","minItems":1,"maxItems":4,"items":{"type":"object","additionalProperties":false,"properties":{"say":{"type":"array","items":{"type":"string","minLength":1,"maxLength":40},"minItems":1,"maxItems":3},"note":{"type":"string","minLength":1,"maxLength":90}},"required":["say","note"]}}},"required":["type","kicker","narration","notes"]}]}}},"required":["id","title","outputFilename","module","scenes"]}
```

## Input
LESSON: id "MS-NABH-01", outputFilename "MedSkills_Intro_MS_NABH_01.mp4", module "Course introduction".

OPENING (the narration's first sentence, exactly): Welcome to the short-term course on National Accreditation Board for Hospitals and Healthcare Providers, sixth edition: implementation and compliance.

SPOKEN COURSE NAME (use it in the closing invitation): National Accreditation Board for Hospitals and Healthcare Providers, sixth edition: implementation and compliance

FULL FORMS (say these in narration; the abbreviation may appear on screen):
CPR = cardiopulmonary resuscitation; AED = automated external defibrillator; BLS = basic life support; ACLS = advanced cardiovascular life support; VF = ventricular fibrillation; VT = ventricular tachycardia; PEA = pulseless electrical activity; ROSC = return of spontaneous circulation; EMS = emergency medical services; ECG = electrocardiogram; CSSD = central sterile services department; PPE = personal protective equipment; ICU = intensive care unit; IV = intravenous; IO = intraosseous; SA = sinoatrial; AV = atrioventricular; BP = blood pressure; HR = human resources; WHO = World Health Organization; AHA = American Heart Association; mmHg = millimetres of mercury; NABH = National Accreditation Board for Hospitals and Healthcare Providers; NABL = National Accreditation Board for Testing and Calibration Laboratories; ISO = International Organization for Standardization; OT = operation theatre; BMW = bio-medical waste; MLT = medical laboratory technology; DMLT = Diploma in Medical Laboratory Technology; DPDP = Digital Personal Data Protection; POSH = Prevention of Sexual Harassment; PC-PNDT = Pre-Conception and Pre-Natal Diagnostic Techniques; PNDT = Pre-Natal Diagnostic Techniques; AERB = Atomic Energy Regulatory Board; SBAR = Situation, Background, Assessment, Recommendation; NICU = neonatal intensive care unit; MLC = medico-legal case; EQAS = external quality assessment scheme; ANM = auxiliary nurse midwife; SOP = standard operating procedure; ICD = International Classification of Diseases; CAPA = corrective and preventive action; SSI = surgical site infection; NQAS = National Quality Assurance Standards; HDU = high dependency unit; FMS = facility management and safety; TLD = thermoluminescent dosimeter; PT = proficiency testing; POCT = point-of-care testing; PHC = primary health centre; NOC = no objection certificate; LASA = look-alike, sound-alike; KPI = key performance indicator; IT = information technology; IQC = internal quality control; IPC = infection prevention and control; HIC = hospital infection control; HAI = healthcare-associated infection; EMR = electronic medical record; HIS = hospital information system; BSc = Bachelor of Science; RSO = radiological safety officer; RACE = Rescue, Alarm, Contain, Extinguish; QMS = quality management system; PRO = public relations officer; PMNDP = Pradhan Mantri National Dialysis Programme; MTP = medical termination of pregnancy; IPSG = International Patient Safety Goals; GNM = General Nursing and Midwifery; EMT = emergency medical technician; ED = emergency department; ASHA = Accredited Social Health Activist

COURSE ROW (the only allowed facts):
<<<
# NABH 6th Edition — Implementation & Compliance (MS-NABH-01)

## Course Code
MS-NABH-01

## Course Name
NABH 6th Edition — Implementation & Compliance

## Category
Accreditation & Quality

## Course Type
Mandatory

## Learning Hours
16

## Short Description
Orient your whole hospital to the 639 objective elements and evidence required by the current accreditation standard.

## Full Description
This certification-grade programme takes hospital teams through the structure, chapters and objective elements of the NABH 6th Edition standard. It covers documentation, policy writing, evidence files, committee functioning, internal audit and the assessment visit itself. Indian hospitals preparing for fresh accreditation or re-accreditation need a shared understanding across clinical, nursing, support and administrative departments so that compliance is continuous rather than assessment driven.

## Course Objectives
1. Explain the structure and chapters of the NABH 6th Edition standard
2. Interpret objective elements and the evidence each one requires
3. Plan departmental documentation, policies and records for accreditation readiness
4. Apply internal audit methods to identify and close compliance gaps

## Course Learning Outcomes
1. Learners can map their department's daily work to relevant objective elements
2. Learners can assemble evidence files that withstand assessor scrutiny during a visit
3. Learners can conduct an internal audit and record non-conformities correctly
4. Learners can draft policies and standard operating procedures in the required format

## Who Can Take This Course
Quality managers, hospital administrators, department heads, nursing superintendents, Medical Officers, NABH coordinators and support service in-charges; required for staff holding accreditation responsibilities in every clinical and non-clinical department.

## Delivery Mode
Online, self-paced (mobile and desktop)

## Assessment
Pre-test and post-test

## Certificate
QR-verified certificate of completion

>>>
