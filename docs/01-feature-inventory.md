# 01 Feature Inventory

## 1) Core spreadsheet model
- Workbooks with multiple sheets, reorder, rename, hide, color.
- Rows/columns: insert, delete, resize, auto-fit.
- Cells: values, formulas, styles, data validation, comments/notes.
- Ranges: named ranges, relative/absolute refs, multi-range selection.
- Undo/redo with grouped operations.

## 2) Formula engine
- Parser: Excel-like grammar and operator precedence.
- Evaluator: expression tree evaluation and vectorized range functions.
- Dependency graph: incremental recalculation and dirty propagation.
- Error handling: #DIV/0!, #REF!, #VALUE!, #NAME?, #N/A.
- Circular references: detection and optional iterative calc.
- Dynamic arrays: spill ranges and array-aware functions.
- Advanced mechanics (post-MVP): 3D references, external workbook links, array constants, range intersection/union operators.

## 3) Function library (core)
- Math: SUM, PRODUCT, ROUND, ABS, MOD, RAND.
- Stats: AVERAGE, COUNT, COUNTA, COUNTIF(S), STDEV.
- Logical: IF, AND, OR, NOT, IFERROR.
- Lookup: XLOOKUP, VLOOKUP, HLOOKUP, INDEX, MATCH.
- Text: CONCAT, TEXT, LEFT, RIGHT, MID, LEN, TRIM.
- Date/time: NOW, TODAY, DATE, DATEDIF, YEAR, MONTH, DAY.
- Advanced (post-MVP): LET, LAMBDA, BYROW, BYCOL, MAP, REDUCE, SCAN, MAKEARRAY, FILTER, SORT, UNIQUE, SEQUENCE.

## 4) Formatting
- Fonts, sizes, colors, borders, alignment, wrap.
- Number formats: general, date/time, currency, percent, custom.
- Conditional formatting: basic rules and color scales.
- Themes and reusable styles.

## 5) Data tools
- Sorting (multi-column), filtering (basic + advanced), remove duplicates.
- Data validation: list/dropdown, numeric bounds, date ranges.
- Tables: header row, structured references, filter row.
- Text-to-columns and basic cleansing.
- What-if analysis (post-MVP): Goal Seek, Solver, data tables.
- Grouping/Outlining (post-MVP): row/column groups, subtotals, consolidate.

## 6) Charts and visualization
- Bar, line, area, pie, scatter, combo.
- Chart editor: titles, labels, legends, axis settings.
- Sparklines (later if needed).
- Advanced chart features (post-MVP): secondary axis, error bars, trendlines, dynamic titles.

## 6.1) Objects and drawing (post-MVP)
- Images on grid with resize/anchor behavior.
- Shapes, arrows, flowcharts, and SmartArt-like primitives.
- Text boxes independent of the grid.

## 7) Pivot tables
- Pivot engine: rows, columns, values, filters.
- Aggregations: SUM, COUNT, AVG, MIN, MAX.
- Pivot charts (later).

## 8) Collaboration (web)
- Real-time multi-user editing with cursors/presence.
- Comments/threads and mentions.
- Version history and rollback.

## 9) File import/export
- XLSX read/write for common sheets, styles, and formulas.
- CSV/TSV import/export with locale rules.
- Print layout and PDF export (desktop).
- Templates: .xltx (post-MVP).
- Legacy/binary: .xls/.xlsb (post-MVP, optional).

## 10) Automation and extensibility
- Custom functions (UDFs) with sandboxed execution.
- Macro engine (optional, later).
- Add-in/plugin system (optional, later).

## 11) Editing UX (post-MVP)
- Paste Special (values, formats, transpose, operations).
- Find & Replace and Go To Special.
- Trace precedents/dependents.
- Merge & Center edge cases.
- Rich text within a single cell.
- Hyperlinks to web/email/locations.

## 12) View, layout, and print (post-MVP)
- Split panes and new window views.
- Custom views (saved filter/print states).
- Page break preview, headers/footers, print titles, scale to fit.

## 13) Accessibility and localization (post-MVP)
- RTL layout and UI mirroring.
- Localized formula names and argument separators.
