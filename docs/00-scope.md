# 00 Scope and Goals

## Product scope
- Platforms: web and desktop.
- Collaboration: required on web (real-time multi-user editing).
- File compatibility: upload and download Excel files (XLSX), plus CSV/TSV.
- No time constraints, but plan for staged delivery.

## Target experience
- Excel-class spreadsheet with strong formula support, charts, pivot tables, data tools, and formatting.
- Fast grid interactions on large sheets (100k+ rows, 1k+ columns, 1M+ cells).
- Desktop app works offline; web app supports collaboration, comments, and version history.

## In-scope for v1
- Core grid editing and selection.
- Formula engine with common functions and dependency graph.
- Formatting, number formats, conditional formatting (basic).
- Data tools: sort, filter, validation, tables.
- Charts (major types).
- XLSX import/export (most common structures and styles).
- Collaboration (web): real-time edits, presence, comments, version history.

## Out-of-scope for v1 (can be later)
- Full VBA compatibility.
- Advanced BI connectors and enterprise governance.
- Complex Excel add-in ecosystem.

## Success criteria
- Open a 1M-cell workbook in under 3 seconds on a modern laptop.
- 60fps scroll with virtualized rendering.
- Formula accuracy for 95% of commonly used Excel functions.
- XLSX round-trip: import, edit, export without data loss for common sheets.
- Multi-user collaboration with low-latency edits and conflict resolution.
