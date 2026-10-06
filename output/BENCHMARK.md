# Pipeline benchmark — ms-bls-29, fx-compose

2026-10-03T23:23 · 4 lesson(s), 1 through the batch check.

> **Not proven yet:** 4 lesson(s) is too few to call any rate stable (needs ≥ 20 across ≥ 2 courses). Treat these numbers as a first reading.

| metric | value |
|---|---|
| first-pass certification (clean as written) | 0% |
| fixed by deterministic fixers | 100% |
| needed a model repair | 0% |
| needed the fallback treatment | 100% |
| certified in the end | 100% |
| tokens per video — mean / median | 0 / 0 |
| voice generation — mean | 16.8 s |
| render — mean | 259 s |
| QA pass on the final MP4 | 100% |
| needed a human | 0% |
| new assets (share of illustration uses) | 100% |
| reusable asset coverage | 0% |

## Failure categories (first pass + QA)
- sync: 1

## Lessons
| lesson | first pass | fixers | repairs | fallback | certified | tokens | voice s | render s | QA | categories |
|---|---|---|---|---|---|---|---|---|---|---|
| ms-bls-29/M00 | — |  |  |  | — | — | 12.5 | 47 | ✅ |  |
| ms-bls-29/M01 | — |  |  |  | — | — | 21.1 | 471 | ✅ |  |
| fx-compose/C01 | — |  |  |  | — | — | — | — | — |  |
| fx-compose/C02 | ❌ | yes |  | yes | ✅ | — | — | — | — | sync |
