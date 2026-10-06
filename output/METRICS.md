# Production metrics

Generated 2026-10-03T19:50:39.599Z on this Mac. Machine stages are measured by the scripts; authoring is Claude Code token usage from transcripts, priced at API list rates (claude-opus-5-5 $4/$20 per MTok; cache writes 1.25×/2× input, reads $0.20) — a subscription is not billed per token, so cost is the API-equivalent for planning.

| video | lang | runtime | words | authoring tokens | output tok | API-eq. cost | authoring wall | preflight | TTS | render | render fps | QA | machine total | MP4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| audit-probe/P01 | en | — | — | — | — | — | — | 4 s | 0 s | 0:00 | — | 0:00 | 0:04 | — |
| demo-asthma-en/AS01 | en | 5:00 | 491 | — | — | — | — | 5 s | 30 s | 3:42 | 40.6 | 0:30 | 5:00 | 64 MB |
| human-heart/H01 | en | — | — | — | — | — | — | 10 s | 0 s | 0:00 | — | 0:00 | 0:10 | 0 MB |
| lab-bp-hi/BP02 | hi | 6:17 | 618 | 1.45M | 16k | $1.14 | 8 min | 5 s | 31 s | 5:41 | 33.2 | 0:51 | 7:27 | 58 MB |
| lab-bp-mr/BP03 | mr | 6:26 | 492 | 536k | 12k | $0.67 | 8 min | 5 s | 36 s | 4:53 | 39.6 | 0:47 | 6:39 | 57 MB |
| lab-diabetes-hi/DM02 | hi | 6:13 | 572 | 1.72M | 8k | $1.06 | 10 min | 6 s | 2 s | 4:43 | 39.5 | 0:54 | 6:03 | 60 MB |
| med-blood-pressure-en/BP01 | en | 5:00 | 498 | 9.59M | 50k | $3.56 | 11 min | 5 s | 20 s | 3:58 | 37.9 | 0:28 | 5:05 | 69 MB |
| med-diabetes-hi/DM01 | hi | 6:17 | 591 | 4.37M | 14k | $1.95 | 11 min | 6 s | 34 s | 5:35 | 33.8 | 0:52 | 7:27 | 60 MB |
| med-hand-hygiene-mr/HH01 | mr | 5:59 | 446 | 5.47M | 15k | $2.28 | 14 min | 5 s | 26 s | 5:11 | 34.7 | 0:46 | 6:46 | 54 MB |
| med-respiration-kn/RS01 | kn | 6:19 | 404 | 7.63M | 16k | $2.93 | 17 min | 5 s | 35 s | 5:44 | 33 | 0:53 | 7:37 | 73 MB |
| ms-bls-29/M00 | en | 1:00 | 87 | — | — | — | — | 4 s | 13 s | 0:47 | 38 | 0:09 | 1:16 | 10 MB |
| ms-bls-29/M01 | en | 5:20 | 658 | — | — | — | — | 4 s | 21 s | 7:51 | 20.4 | 0:40 | 9:14 | 69 MB |
| ms-cssd-15/V801 | en | — | — | — | — | — | — | 3 s | 0 s | 0:00 | — | 0:00 | 0:03 | 0 MB |
| ms-cssd-15/V802 | en | 3:15 | 384 | — | — | — | — | 3 s | 0 s | 0:00 | — | 0:00 | 0:03 | 0 MB |
| ms-cssd-15/V803 | en | 3:23 | 362 | — | — | — | — | 3 s | 0 s | 0:00 | — | 0:00 | 0:03 | 0 MB |
| ms-cssd-15/V804 | en | 3:28 | 351 | — | — | — | — | 3 s | 0 s | 0:00 | — | 0:00 | 0:03 | 0 MB |
| ms-cssd-15/V805 | en | 3:31 | 374 | — | — | — | — | 3 s | 0 s | 0:00 | — | 0:00 | 0:03 | 0 MB |

## Rates (measured)

- Machine time: **1.16 min per minute of finished video** (10 video(s), 53.9 min of video, 63 min of machine time; render dominates and is CPU-bound — one job at a time).
- Authoring (Claude): **4.39M tokens, $1.94 API-equivalent, ~11 min** per video on average (7 video(s)).
- One-off overhead (not per video): pipeline: MedSkills brand, Clinical style, languages, packs, metrics 25.98M tokens / $10.44 / 42.9 min; review, fixes, docs, orchestration 37.84M tokens / $9.13 / 75.8 min.

## ETA and cost model

Machine time runs unattended, one video at a time; authoring runs in parallel ahead of it (subagents), so wall-clock ≈ max(machine, authoring ÷ parallel writers).

| batch | video length | machine time | authoring tokens | authoring cost (API-eq.) |
|---|---|---|---|---|
| 10 | 5 min | 1.0 h (0.0 days) | 43.95M | $19 |
| 10 | 10 min | 1.9 h (0.1 days) | 87.90M | $39 |
| 50 | 5 min | 4.8 h (0.2 days) | 219.74M | $97 |
| 50 | 10 min | 9.7 h (0.4 days) | 439.48M | $194 |
| 100 | 5 min | 9.7 h (0.4 days) | 439.48M | $194 |
| 100 | 10 min | 19.4 h (0.8 days) | 878.96M | $388 |
| 500 | 5 min | 48.4 h (2.0 days) | 2197.41M | $971 |
| 500 | 10 min | 96.8 h (4.0 days) | 4394.82M | $1941 |

Authoring scales roughly with narration length (the 10-min rows assume 2× a 5-min script). New subjects that need bespoke illustration packs add one-off overhead.
