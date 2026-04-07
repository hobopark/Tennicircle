---
version: 1.0
project: TenniCircle
profile: default
last_calibrated: {DATE}
---

# Evaluation Criteria

Scoring rubric for the GSD harness evaluation layer. This file defines how phases are graded after execution. Customise the weights, thresholds, and rubric levels to match your project type.

---

## Active Profile: `default`

See [Profiles](#profiles) at the bottom to switch for different project types.

---

## Criteria

### 1. Functionality

**Weight: 30%**

Does the feature actually work end-to-end, not just exist in the codebase?

| Score | Level | Description |
|-------|-------|-------------|
| 1–3   | Broken | Core feature broken or stubbed. Critical user flows fail. TODO/placeholder code in production paths. |
| 4–5   | Partial | Feature technically runs but has obvious bugs, missing edge cases, or broken secondary flows. Happy path works, nothing else. |
| 6–7   | Solid | Primary user flows work correctly. Minor edge cases may be unhandled. Error states are reasonable. |
| 8–9   | Strong | All user flows work including edge cases. Error handling is thoughtful. Performance is acceptable under realistic load. |
| 10    | Bulletproof | Graceful degradation. Handles adversarial input. Production-ready without caveats. Could ship today. |

---

### 2. Product Depth

**Weight: 25%**

Does the implementation deliver the full intent of the spec, or a shallow version?

| Score | Level | Description |
|-------|-------|-------------|
| 1–3   | Shallow | Implements only the most obvious interpretation. Missing most implied requirements. No empty states, no feedback, no defaults. |
| 4–5   | Literal | Covers the written spec but nothing beyond. No loading indicators, no empty states, no helpful defaults. Feels like a checklist. |
| 6–7   | Thoughtful | Delivers spec plus reasonable implied requirements. Has loading states, empty states, sensible defaults. Anticipates the obvious. |
| 8–9   | Deep | Anticipates user needs beyond the spec. Thoughtful micro-interactions, smart defaults, progressive disclosure. Feels like someone cared. |
| 10    | Exceptional | Feels like a product team iterated on it. Every detail considered. Users would assume a human product designer was involved. |

---

### 3. UX & Design Quality

**Weight: 25%**

Does this feel like a coherent product or a collection of components?

| Score | Level | Description |
|-------|-------|-------------|
| 1–3   | Default | Unmodified component library output. Inconsistent spacing, colours, typography. No visual identity. |
| 4–5   | Generic | Functional but recognisable as AI-generated. Stock layout, safe colours, no personality. Purple gradients on white cards territory. |
| 6–7   | Cohesive | Consistent visual identity. Spacing and typography are intentional. Feels designed but unremarkable. |
| 8–9   | Distinctive | Clear aesthetic choices that create a mood. Layout, colour, and typography work as a unified system. Stands out from defaults. |
| 10    | Memorable | A human designer would recognise deliberate creative choices. The interface has a point of view. |

**Note:** For backend-only / API-only phases, this criterion evaluates API design quality instead — endpoint consistency, error response format, documentation quality, developer experience.

---

### 4. Code Quality

**Weight: 20%**

Is the code maintainable, well-structured, and following project conventions?

| Score | Level | Description |
|-------|-------|-------------|
| 1–3   | Messy | Spaghetti code. No separation of concerns. Duplicated logic everywhere. No types or validation. |
| 4–5   | Functional | Works but disorganised. Inconsistent naming, mixed patterns, no error boundaries. Would frustrate the next developer. |
| 6–7   | Clean | Clear structure. Follows project conventions. Reasonable separation of concerns. Types present where expected. |
| 8–9   | Well-Crafted | Reusable patterns. Proper error handling throughout. Good test coverage. Self-documenting naming. |
| 10    | Exemplary | Could be used as a reference implementation. Future-proof architecture. Comprehensive tests. Self-documenting. |

---

## Thresholds

```
PASS:            Every criterion ≥ 6  AND  weighted average ≥ 7.0
PASS WITH NOTES: Every criterion ≥ 5  AND  weighted average ≥ 6.5
FAIL:            Any criterion < 5    OR   weighted average < 6.5
```

---

## Profiles

Switch the active profile by changing `profile:` in the frontmatter and uncommenting the relevant weight block below.

### `default` — Balanced (Full-Stack Apps)
```
Functionality: 30%  |  Product Depth: 25%  |  UX & Design: 25%  |  Code Quality: 20%
```

### `api` — Backend / API-Heavy Projects
```
Functionality: 35%  |  Product Depth: 20%  |  API Design: 25%  |  Code Quality: 20%
```
Replace "UX & Design" with "API Design" — evaluates endpoint consistency, error response formats, documentation, and developer experience.

### `consumer` — Design-Forward Consumer Apps
```
Functionality: 25%  |  Product Depth: 25%  |  UX & Design: 35%  |  Code Quality: 15%
```

### `data` — Data Pipelines / ETL
```
Functionality: 30%  |  Data Integrity: 30%  |  Observability: 20%  |  Code Quality: 20%
```
Replace "Product Depth" with "Data Integrity" (validation, idempotency, schema enforcement). Replace "UX & Design" with "Observability" (logging, monitoring hooks, failure recovery, alerting).

### `prototype` — Rapid Prototyping / Proof of Concept
```
Functionality: 40%  |  Product Depth: 30%  |  UX & Design: 20%  |  Code Quality: 10%
```
Lower thresholds: PASS at weighted average ≥ 6.0, every criterion ≥ 4.

---

## Calibration Notes

Record score corrections here after each evaluation round where you disagreed with the evaluator's scores. These examples anchor future evaluations.

<!--
Example format:

### Phase 3 — Round 1 (2026-04-06)
- UX & Design: Evaluator scored 7, I scored 5. Reason: evaluator didn't penalise default shadcn card styling. Cards had zero customisation — shadow-md, rounded-lg, text-gray-600 are all library defaults.
- Functionality: Evaluator scored 8, I scored 8. Agreed.
- Added to rubric: "Unmodified shadcn/Tailwind UI defaults with no project-specific token overrides = max score 5 on UX & Design."
-->
