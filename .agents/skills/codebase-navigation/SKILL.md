---
name: codebase-navigation
description: "Token-efficient codebase navigation using Graphify, ripgrep, and targeted file slices. Prevents large context blowouts."
---

# Token-Efficient Codebase Navigation

## Purpose
Navigate the ADC Exam Prep App repository with maximum precision and minimum token consumption.

## High-Cost Token Hazards (DO NOT DO)
1. **Never read `graphify-out/graph.json` directly:** This file is > 4.3 MB (~1.2 million tokens) and will overwhelm your context window.
2. **Never read large test question dumps:** Files like `scripts/adc-questions.json` (300 KB) or raw question seeds should only be inspected via targeted ripgrep matches.
3. **Never read entire 800-line files when inspecting a single function:** Always specify `StartLine` and `EndLine` slices in `view_file`.

## Recommended Navigation Sequence
```
1. Specific identifier/symbol search -> grep_search (targeted query)
2. Architecture / cross-file path    -> graphify query "<concept>" or graphify path "<A>" "<B>"
3. Deep dive into target function    -> view_file (StartLine/EndLine slice, <= 100 lines)
```

## Graphify Rules
- If `graphify` command fails due to local Python/uv environment paths, fallback to fast `grep_search` with path filters (`src/app/api/...`, `src/lib/...`).
- Read `graphify-out/GRAPH_REPORT.md` (44 KB) only for broad architectural reviews, never for simple file lookups.
