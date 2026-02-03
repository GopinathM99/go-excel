# 11 Post-MVP Plan (Full Excel Feature Parity)

This plan covers the feature set beyond MVP, structured as phases with dependencies, deliverables, and acceptance criteria. It assumes the MVP core engine is stable and collaboration is live on web.

## Guiding principles
- Preserve compatibility: no regressions in XLSX round-trip.
- Build correctness before breadth: formula accuracy and file fidelity.
- Add power-user features incrementally behind feature flags.

## Phase 1: Formula and Function Parity

### Goals
- Expand function library to cover the majority of Excel use cases.
- Improve formula engine accuracy and edge-case handling.

### Deliverables
- Function categories:
  - Financial: PV, FV, NPV, IRR, XIRR, RATE
  - Statistical: MEDIAN, MODE, PERCENTILE, QUARTILE
  - Logical: SWITCH, IFS
  - Lookup: XMATCH, OFFSET, INDIRECT
  - Text: TEXTJOIN, SUBSTITUTE, FIND/SEARCH
  - Date/Time: WORKDAY, NETWORKDAYS, EDATE
  - Array: FILTER, SORT, UNIQUE, SEQUENCE
- Advanced formula mechanics:
  - LET and LAMBDA
  - 3D references (Sheet1:Sheet3!A1)
  - External links to other workbooks
  - Array constants (e.g., {1,2;3,4})
  - Range intersection and union operators
- Dynamic array support with spill ranges and implicit intersection rules.
- Volatile functions and calc modes.

### Acceptance criteria
- Passes a curated Excel formula test corpus with 95%+ match.
- Stable performance on 500k+ dependent cells.

## Phase 2: Advanced Formatting and Styles

### Goals
- Achieve high fidelity for Excel styles.

### Deliverables
- Full conditional formatting rules:
  - Icon sets, color scales, data bars.
- Advanced number formats:
  - Custom format strings, locale-aware formats.
- Rich cell styles:
  - Border styles, gradients, theme fonts.
- Rich text and hyperlink rendering in cells.

### Acceptance criteria
- XLSX import/export preserves formatting for common templates.

## Phase 3: Pivot Tables and Pivot Charts

### Goals
- Add pivot table creation and editing comparable to Excel basics.

### Deliverables
- Pivot cache layer for large datasets.
- Pivot table UI: drag/drop fields, filters, values.
- Calculated fields and subtotals.
- Pivot charts with basic editing.

### Acceptance criteria
- Pivot tables on 100k-row datasets are responsive.

## Phase 4: Charts and Visualization Expansion

### Goals
- Provide rich charting similar to Excel.

### Deliverables
- Additional chart types:
  - Area, combo, scatter, bubble, histogram, box/whisker.
- Trendlines, data labels, annotations.
- Secondary axis, error bars, and dynamic chart titles.
- Export charts to image/PDF.

### Acceptance criteria
- Chart updates on live data edits without lag.

## Phase 5: Advanced Data Tools

### Goals
- Provide power-user data workflows.

### Deliverables
- Power Query-like import pipeline (lite):
  - CSV/JSON transform steps and re-run.
- Data cleanup utilities:
  - Remove duplicates, text-to-columns, flash fill.
- Advanced filter and slicers.
- What-if analysis:
  - Goal Seek, Solver, one/two-variable data tables.
- Structure tools:
  - Grouping/outlining, subtotals, consolidate.

### Acceptance criteria
- Data tools work on large datasets without UI freezing.

## Phase 6: Automation and Extensibility

### Goals
- Enable custom workflows and add-ins.

### Deliverables
- Macro engine (sandboxed).
- Custom function framework (UDFs).
- Add-in/plugin API and marketplace model (later).
- Office Scripts compatibility (optional).
- VBA import warnings or parser for legacy workbooks (optional).

### Acceptance criteria
- Macros run with predictable performance and security constraints.

## Phase 7: Collaboration Advanced Features

### Goals
- Enterprise-grade collaboration.

### Deliverables
- Granular permissions: range-level locks, sheet-level ACLs.
- Change tracking and audit history.
- Review/approve workflows.
- Offline edits with merge on reconnect.

### Acceptance criteria
- No data loss on concurrent edits and reconnections.

## Phase 8: File Format Parity

### Goals
- Near-complete XLSX compatibility.

### Deliverables
- Support for advanced Excel features:
  - Pivot charts, complex conditional formatting, advanced styles.
  - Named tables, structured references, and Excel metadata.
- Handling of legacy or complex constructs on import.
- Template formats (.xltx).
- Legacy/binary formats (.xls, .xlsb) if required.

### Acceptance criteria
- XLSX round-trip for advanced templates retains layout and logic.

## Phase 9: Performance and Scale Hardening

### Goals
- Support very large workbooks reliably.

### Deliverables
- Multi-threaded calc and render pipelines.
- Memory-efficient storage for large grids.
- Adaptive caching and compression.

### Acceptance criteria
- 5M+ cells with stable scrolling and acceptable memory usage.

## Phase 10: Platform Polish

### Goals
- Provide a refined desktop and web experience.

### Deliverables
- Desktop:
  - Native file dialogs, OS integrations, auto-updates.
- Web:
  - Progressive web app support, offline fallback.
- Localization and accessibility improvements.
- View and print features:
  - Split panes, new window, custom views.
  - Page break preview, headers/footers, print titles, scale to fit.
- Internationalization:
  - RTL layout support and localized function names.

### Acceptance criteria
- Accessibility audits pass for core workflows.

## Dependencies and sequencing notes
- Formula parity (Phase 1) should precede most other advanced features.
- Pivot tables require solid formula and data model support.
- Full XLSX parity (Phase 8) is an ongoing effort aligned with each phase.

## Recommended governance
- Maintain an Excel compatibility matrix per feature.
- Keep a backlog of edge-case XLSX files that must round-trip.
- Use feature flags for advanced or unstable features.
