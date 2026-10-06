# QA — ms-cssd-15

2026-09-24T20:19:59.440Z

### V801 — PASS

| check | | detail |
|---|---|---|
| format | ✅ | 1920×1080 30fps h264 yuv420p |
| color tags | ✅ | bt709/bt709/bt709 |
| audio stream | ✅ | aac 48000Hz 2ch |
| duration | ✅ | 7216 video frames vs schedule 7216 (240.53s) |
| cuts on boundaries | ✅ | 0 hard changes; 0 off-boundary |
| decode integrity | ✅ | clean full decode |
| no black frames | ✅ | none |
| no frozen picture | ✅ | none ≥3s |
| loudness | ✅ | -14 LUFS (target −14) |
| true peak | ✅ | -1.3 dBTP |
| no clipping | ✅ | sample peak -1.3 dBFS |
| poster frame | ✅ | frame0 Y=155.9 vs frame4 Y=211.0 |
| srt | ✅ | 80 cues, last ends 234.19s |
| render = stills | ✅ | 22 sampled frames match |
| layout | ✅ | no overflow |

### V803 — PASS

| check | | detail |
|---|---|---|
| format | ✅ | 1920×1080 30fps h264 yuv420p |
| color tags | ✅ | bt709/bt709/bt709 |
| audio stream | ✅ | aac 48000Hz 2ch |
| duration | ✅ | 6084 video frames vs schedule 6084 (202.80s) |
| cuts on boundaries | ✅ | 0 hard changes; 0 off-boundary |
| decode integrity | ✅ | clean full decode |
| no black frames | ✅ | none |
| no frozen picture | ✅ | none ≥3s |
| loudness | ✅ | -14 LUFS (target −14) |
| true peak | ✅ | -1.4 dBTP |
| no clipping | ✅ | sample peak -1.4 dBFS |
| poster frame | ✅ | frame0 Y=169.9 vs frame4 Y=211.0 |
| srt | ✅ | 68 cues, last ends 196.43s |
| render = stills | ✅ | 17 sampled frames match |
| layout | ✅ | no overflow |

### V805 — FAIL

| check | | detail |
|---|---|---|
| format | ✅ | 1920×1080 30fps h264 yuv420p |
| color tags | ✅ | bt709/bt709/bt709 |
| audio stream | ✅ | aac 48000Hz 2ch |
| duration | ✅ | 6330 video frames vs schedule 6330 (211.00s) |
| cuts on boundaries | ✅ | 0 hard changes; 0 off-boundary |
| decode integrity | ✅ | clean full decode |
| no black frames | ✅ | none |
| no frozen picture | ✅ | none ≥3s |
| loudness | ✅ | -14 LUFS (target −14) |
| true peak | ✅ | -1.4 dBTP |
| no clipping | ✅ | sample peak -1.4 dBFS |
| poster frame | ✅ | frame0 Y=152.6 vs frame4 Y=211.0 |
| srt | ✅ | 73 cues, last ends 204.69s |
| render = stills | ✅ | 9 sampled frames match |
| layout | ❌ | 1648 example: 684px ink in right margin; 4151 compare: 1173px ink in caption band L |
