# 12 Post-MVP Backlog (Epics and Tickets)

This backlog extends the MVP into full Excel-class parity. It is grouped by phase/epic with tickets and acceptance criteria.

## Ticket template
- ID:
- Title:
- Epic:
- Goal:
- Scope:
- Estimate (S/M/L):
- Priority (P0/P1/P2):
- Acceptance criteria:
- Dependencies:
- Notes:

## Epic P1: Formula and Function Parity

- ID: P1-1
- Title: Expand financial function set
- Epic: Formula and Function Parity
- Goal: Add core financial functions.
- Scope: PV, FV, NPV, IRR, XIRR, RATE.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Results match Excel for standard examples.
- Dependencies: MVP formula engine

- ID: P1-2
- Title: Add advanced statistical functions
- Epic: Formula and Function Parity
- Goal: Expand stats coverage.
- Scope: MEDIAN, MODE, PERCENTILE, QUARTILE.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Function results match Excel for test corpus.
- Dependencies: MVP formula engine

- ID: P1-3
- Title: Dynamic array functions
- Epic: Formula and Function Parity
- Goal: Add array-aware functions.
- Scope: FILTER, SORT, UNIQUE, SEQUENCE.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Spill behavior matches Excel in common cases.
- Dependencies: MVP formula engine

- ID: P1-4
- Title: Volatile functions and calc modes
- Epic: Formula and Function Parity
- Goal: Support recalculation strategies.
- Scope: NOW, TODAY, RAND, volatile dependency tracking.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Volatile functions update correctly per calc mode.
- Dependencies: MVP formula engine

- ID: P1-5
- Title: LET and LAMBDA support
- Epic: Formula and Function Parity
- Goal: Enable reusable logic in formulas.
- Scope: LET bindings, LAMBDA definitions and calls.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - LET/LAMBDA examples match Excel behavior.
- Dependencies: MVP formula engine

- ID: P1-6
- Title: Dynamic array helper functions
- Epic: Formula and Function Parity
- Goal: Expand array function coverage.
- Scope: BYROW, BYCOL, MAP, REDUCE, SCAN, MAKEARRAY.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Helper functions spill and calculate correctly.
- Dependencies: P1-3

- ID: P1-7
- Title: 3D references and external links
- Epic: Formula and Function Parity
- Goal: Support cross-sheet and cross-workbook refs.
- Scope: Sheet1:Sheet3!A1 and [Book.xlsx]Sheet1!A1.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Recalc works across sheet ranges and linked books.
- Dependencies: MVP formula engine, MVP XLSX

- ID: P1-8
- Title: Array constants and range operators
- Epic: Formula and Function Parity
- Goal: Support array literals and intersection/union.
- Scope: {1,2;3,4} and space/comma operators.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Array literals parse and evaluate correctly.
- Dependencies: MVP formula engine

## Epic P2: Advanced Formatting and Styles

- ID: P2-1
- Title: Advanced conditional formatting
- Epic: Advanced Formatting and Styles
- Goal: Complete conditional formatting support.
- Scope: icon sets, data bars, multi-color scales.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Imported XLSX retains conditional formatting.
- Dependencies: MVP formatting, XLSX support

- ID: P2-2
- Title: Custom number formats
- Epic: Advanced Formatting and Styles
- Goal: Full number format strings.
- Scope: custom formats, locale-aware formats.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Custom formats render accurately on import.
- Dependencies: MVP formatting

- ID: P2-3
- Title: Theme and style fidelity
- Epic: Advanced Formatting and Styles
- Goal: Improve style mapping.
- Scope: theme colors, gradients, border styles.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - XLSX round-trip preserves styles for templates.
- Dependencies: MVP formatting, XLSX support

- ID: P2-4
- Title: Rich text and hyperlinks in cells
- Epic: Advanced Formatting and Styles
- Goal: Support multi-style text and links.
- Scope: mixed formatting runs and hyperlink objects.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Imported rich text and links render correctly.
- Dependencies: MVP formatting, MVP XLSX

## Epic P3: Pivot Tables and Pivot Charts

- ID: P3-1
- Title: Pivot cache layer
- Epic: Pivot Tables and Pivot Charts
- Goal: Enable fast pivoting of large datasets.
- Scope: cache computation, refresh logic.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Pivot refresh on 100k rows is responsive.
- Dependencies: MVP data tools

- ID: P3-2
- Title: Pivot table UI builder
- Epic: Pivot Tables and Pivot Charts
- Goal: Build pivot field drag/drop interface.
- Scope: rows, columns, values, filters.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Basic pivot created and updated interactively.
- Dependencies: P3-1

- ID: P3-3
- Title: Pivot charts
- Epic: Pivot Tables and Pivot Charts
- Goal: Visualize pivots.
- Scope: pivot chart types and updates.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Pivot charts update with pivot changes.
- Dependencies: P3-2

## Epic P4: Advanced Charts

- ID: P4-1
- Title: Extended chart types
- Epic: Advanced Charts
- Goal: Broaden chart coverage.
- Scope: area, combo, scatter, bubble, histogram, box/whisker.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - All chart types render and update on data edits.
- Dependencies: MVP charts

- ID: P4-2
- Title: Trendlines and annotations
- Epic: Advanced Charts
- Goal: Add analytical overlays.
- Scope: trendlines, labels, annotations.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Trendlines match Excel defaults.
- Dependencies: P4-1

- ID: P4-3
- Title: Secondary axis and error bars
- Epic: Advanced Charts
- Goal: Add advanced chart axes and metrics.
- Scope: dual axes, error bars, axis formatting.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Secondary axis renders and updates correctly.
- Dependencies: P4-1

- ID: P4-4
- Title: Dynamic chart titles
- Epic: Advanced Charts
- Goal: Link chart titles to cells.
- Scope: title binding to cell values.
- Estimate (S/M/L): S
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Title updates with source cell changes.
- Dependencies: P4-1

## Epic P5: Advanced Data Tools

- ID: P5-1
- Title: Import pipeline (Power Query lite)
- Epic: Advanced Data Tools
- Goal: Reusable data transforms.
- Scope: CSV/JSON steps, re-run pipeline.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Users can reapply transforms to updated data.
- Dependencies: MVP data tools

- ID: P5-2
- Title: Data cleanup utilities
- Epic: Advanced Data Tools
- Goal: Advanced cleanup flows.
- Scope: remove duplicates, text-to-columns, flash fill.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Tools operate on 100k rows without UI blocking.
- Dependencies: MVP data tools

- ID: P5-3
- Title: Slicers and advanced filters
- Epic: Advanced Data Tools
- Goal: Interactive filtering.
- Scope: slicers for tables and pivots.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Slicers update filtered ranges in real time.
- Dependencies: P3-2

- ID: P5-4
- Title: What-if analysis tools
- Epic: Advanced Data Tools
- Goal: Add Goal Seek, Solver, and data tables.
- Scope: target value solving, constraints, 1/2-variable tables.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Goal Seek achieves target within tolerance.
- Dependencies: MVP formula engine, MVP data tools

- ID: P5-5
- Title: Grouping, subtotals, consolidate
- Epic: Advanced Data Tools
- Goal: Structural and summary tools.
- Scope: row/column grouping, subtotal rows, consolidate by category/position.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Outline groups collapse/expand without data loss.
- Dependencies: MVP data tools

## Epic P6: Automation and Extensibility

- ID: P6-1
- Title: Custom function framework (UDF)
- Epic: Automation and Extensibility
- Goal: User-defined functions.
- Scope: sandboxed execution, parameter types.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - UDFs can be registered and recalculated safely.
- Dependencies: MVP formula engine

- ID: P6-2
- Title: Macro engine
- Epic: Automation and Extensibility
- Goal: Enable scripted automation.
- Scope: macro recorder and interpreter.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Macros run and can be saved/loaded.
- Dependencies: P6-1

- ID: P6-3
- Title: Add-in/plugin API
- Epic: Automation and Extensibility
- Goal: Extensible platform.
- Scope: plugin manifest and lifecycle hooks.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Plugins can add UI commands and custom functions.
- Dependencies: P6-1

- ID: P6-4
- Title: Office Scripts compatibility (optional)
- Epic: Automation and Extensibility
- Goal: Support TypeScript-based automation.
- Scope: script execution model and APIs.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Common Office Scripts run with expected results.
- Dependencies: P6-1

- ID: P6-5
- Title: VBA import warnings or parser (optional)
- Epic: Automation and Extensibility
- Goal: Improve legacy workbook compatibility.
- Scope: detect VBA projects and surface warnings.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Users get clear warnings on VBA content.
- Dependencies: MVP XLSX

## Epic P7: Collaboration Advanced

- ID: P7-1
- Title: Range-level permissions
- Epic: Collaboration Advanced
- Goal: Granular access control.
- Scope: lock ranges, permissions UI.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Locked ranges reject edits from non-owners.
- Dependencies: MVP collaboration

- ID: P7-2
- Title: Change tracking and approvals
- Epic: Collaboration Advanced
- Goal: Workflow for review and approval.
- Scope: track changes, accept/reject.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Track changes works across collaborators.
- Dependencies: MVP collaboration

- ID: P7-3
- Title: Offline edits and merge
- Epic: Collaboration Advanced
- Goal: Offline support.
- Scope: local edits and server merge on reconnect.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - No data loss on reconnect.
- Dependencies: MVP collaboration

## Epic P8: XLSX Parity

- ID: P8-1
- Title: Advanced style and metadata support
- Epic: XLSX Parity
- Goal: Improve file fidelity.
- Scope: structured tables, metadata, advanced styles.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - XLSX round-trip retains table styles and metadata.
- Dependencies: MVP XLSX

- ID: P8-2
- Title: Complex conditional formatting and rules
- Epic: XLSX Parity
- Goal: Full conditional formatting parity.
- Scope: multiple rule types and priorities.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - XLSX import/export retains rule ordering.
- Dependencies: P2-1

- ID: P8-3
- Title: Pivot and chart compatibility
- Epic: XLSX Parity
- Goal: Preserve advanced visuals.
- Scope: pivot charts, chart metadata.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Advanced charts open in Excel without loss.
- Dependencies: P3-3, P4-1

- ID: P8-4
- Title: Template file support (.xltx)
- Epic: XLSX Parity
- Goal: Handle Excel template files.
- Scope: import/export .xltx.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Templates open and save without corruption.
- Dependencies: MVP XLSX

- ID: P8-5
- Title: Legacy binary formats (.xls/.xlsb)
- Epic: XLSX Parity
- Goal: Support legacy files if required.
- Scope: import (export optional) for .xls/.xlsb.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Legacy files open with acceptable fidelity.
- Dependencies: MVP XLSX

## Epic P9: Performance and Scale

- ID: P9-1
- Title: Multi-threaded calculation
- Epic: Performance and Scale
- Goal: Improve large workbook performance.
- Scope: calc worker pool, batching.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - 5M cells recalc within target thresholds.
- Dependencies: MVP formula engine

- ID: P9-2
- Title: Memory-optimized grid storage
- Epic: Performance and Scale
- Goal: Reduce memory usage.
- Scope: sparse storage, compression.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Memory usage stable on 5M+ cells.
- Dependencies: MVP grid

## Epic P10: Platform Polish

- ID: P10-1
- Title: Desktop OS integrations
- Epic: Platform Polish
- Goal: Native desktop experience.
- Scope: file dialogs, auto-updates, shortcuts.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Desktop app passes basic UX checks.
- Dependencies: MVP desktop shell

- ID: P10-2
- Title: Web PWA + offline
- Epic: Platform Polish
- Goal: Improve web experience.
- Scope: PWA install, offline fallback.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Web app supports offline viewing.
- Dependencies: MVP web

- ID: P10-3
- Title: Accessibility and localization
- Epic: Platform Polish
- Goal: Broader user support.
- Scope: keyboard navigation, screen reader labels, i18n.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Passes accessibility audit for core flows.
- Dependencies: MVP UI

## Epic P11: Advanced Editing UX

- ID: P11-1
- Title: Paste Special
- Epic: Advanced Editing UX
- Goal: Advanced paste options.
- Scope: values, formats, transpose, skip blanks, arithmetic ops.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Paste Special matches Excel for common cases.
- Dependencies: MVP clipboard, MVP formatting

- ID: P11-2
- Title: Find & Replace
- Epic: Advanced Editing UX
- Goal: Search by value, formula, or format.
- Scope: find next/prev, replace, replace all.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Replaces values in selected ranges or sheet.
- Dependencies: MVP grid

- ID: P11-3
- Title: Go To Special
- Epic: Advanced Editing UX
- Goal: Select specific cell types.
- Scope: blanks, constants, formulas, visible cells only.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Selection matches Excel for test cases.
- Dependencies: MVP grid

- ID: P11-4
- Title: Trace precedents/dependents
- Epic: Advanced Editing UX
- Goal: Visualize formula relationships.
- Scope: arrows for precedents and dependents.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Visual links update on formula changes.
- Dependencies: MVP dependency graph

## Epic P12: View, Layout, and Print

- ID: P12-1
- Title: Split panes and new window
- Epic: View, Layout, and Print
- Goal: Advanced viewing options.
- Scope: split panes, multiple views of same workbook.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Independent scroll regions work correctly.
- Dependencies: MVP grid

- ID: P12-2
- Title: Custom views
- Epic: View, Layout, and Print
- Goal: Save view states.
- Scope: filter/print/hidden row states.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Views can be saved and restored.
- Dependencies: MVP grid

- ID: P12-3
- Title: Print layout and page breaks
- Epic: View, Layout, and Print
- Goal: Visual print setup.
- Scope: page break preview, drag page breaks.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Page breaks render and export correctly.
- Dependencies: MVP print/export

- ID: P12-4
- Title: Headers, footers, and print titles
- Epic: View, Layout, and Print
- Goal: Full print controls.
- Scope: header/footer editor, repeat rows/cols, scale to fit.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Print exports honor titles and scaling.
- Dependencies: P12-3

## Epic P13: Objects and Drawing

- ID: P13-1
- Title: Images on grid
- Epic: Objects and Drawing
- Goal: Insert and manipulate images.
- Scope: image add, resize, anchor to cells.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Images move/resize with cells as configured.
- Dependencies: MVP grid

- ID: P13-2
- Title: Shapes and connectors
- Epic: Objects and Drawing
- Goal: Draw shapes and arrows.
- Scope: basic shapes, connectors, styling.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Shapes persist on save and load.
- Dependencies: P13-1

- ID: P13-3
- Title: Text boxes
- Epic: Objects and Drawing
- Goal: Floating text containers.
- Scope: text box creation and formatting.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Text boxes render and export correctly.
- Dependencies: P13-1

## Epic P14: Compatibility and Localization

- ID: P14-1
- Title: Localized formula names and separators
- Epic: Compatibility and Localization
- Goal: Support localized function names and separators.
- Scope: parse and render localized functions and separators.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Common localized formulas parse correctly.
- Dependencies: MVP formula engine

- ID: P14-2
- Title: RTL layout support
- Epic: Compatibility and Localization
- Goal: Right-to-left sheet layout.
- Scope: UI mirroring and column order reversal.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - RTL mode mirrors layout and selection behavior.
- Dependencies: MVP UI
