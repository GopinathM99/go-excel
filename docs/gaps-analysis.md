# Gap Analysis: MS Excel Clone

This document identifies features and capabilities standard in Microsoft Excel that are currently missing or under-specified in the project documentation (Scope, Feature Inventory, MVP Backlog, Post-MVP Backlog).

## 1. Advanced Formula Capabilities

### Modern Excel Functions
- **LAMBDA & LET**: Support for defining custom reusable logic within formulas and local variables (`LET`) is missing.
- **Dynamic Array Extensions**: While `FILTER`/`SORT` are planned, helper functions like `BYROW`, `BYCOL`, `MAP`, `REDUCE`, `SCAN`, `MAKEARRAY` are not listed.
- **Rich Data Types**: Support for Stocks, Geography, or custom data types (linked entities) beyond text/numbers.

### Legacy/Specialized Functions
- **Database Functions**: `DSUM`, `DCOUNT`, etc.
- **Engineering Functions**: `CONVERT`, `BESSEL`, etc.
- **Information Functions**: `CELL`, `INFO` (often needed for compatibility).
- **Cube Functions**: Integration with OLAP/Data models.

### Formula Mechanics
- **3D References**: Referencing the same cell across multiple sheets (e.g., `=SUM(Sheet1:Sheet3!A1)`).
- **External Links**: References to cells in *other* workbook files (e.g., `=[Budget.xlsx]Sheet1!A1`). This is a major complexity area for web/desktop clones.
- **Array Constants**: Inputting arrays directly like `{1,2;3,4}`.
- **Intersects/Unions**: Range operators (space for intersection, comma for union).

## 2. Core Grid & Editing UX

### Clipboard Operations
- **Paste Special**: Options for "Values Only", "Formats Only", "Transpose", "Skip Blanks", and arithmetic operations (Add/Multiply).
- **Clipboard History**: Multiple item storage.

### Navigation & Selection
- **Find & Replace**: Complete UI for searching by value, formula, or format, including "Replace All".
- **Go To Special**: Selecting specific cell types (Blanks, Visible cells only, Constants, Formulas, Last Cell).
- **Trace Precedents/Dependents**: Visual arrows showing formula relationships.

### Cell Structure
- **Merge & Center**: While "merged cells" are mentioned in testing, the UX and edge cases (sorting merged ranges) need explicit handling.
- **Rich Text**: Multiple styles (bold/color) applied to *parts* of text within a single cell.
- **Hyperlinks**: Clickable links to web, email, or places in document (bookmarks).

## 3. Data Management & Analysis

### "What-If" Analysis
- **Goal Seek**: Finding an input value to reach a target result.
- **Solver**: Optimization for multiple variables/constraints.
- **Data Tables**: One/Two-variable sensitivity analysis tables.

### Structural Tools
- **Grouping & Outlining**: Collapsible row/column groups (plus/minus buttons in margins).
- **Subtotal**: Automatic insertion of subtotal rows in sorted lists.
- **Consolidate**: Aggregating data from different ranges by position or category.

## 4. Visualization & Objects

### Graphics
- **Images**: Inserting and resizing images on the grid.
- **Shapes & SmartArt**: Drawing primitives (arrows, rectangles, flowcharts).
- **Text Boxes**: Floating text containers independent of grid.

### Charting Details
- **Secondary Axis**: Plotting mixed data types on dual axes.
- **Error Bars**: Statistical visualization on series.
- **Dynamic Chart Titles**: Linking titles to cell contents.

## 5. View & Layout

### Window Management
- **Split Panes**: Different from Freeze Panes; allowing independent scrolling of four quadrants.
- **New Window**: Opening a second view of the *same* workbook.
- **Custom Views**: Saving named filter/print/hidden-row states.

### Print Layout
- **Page Break Preview**: Drag-and-drop page breaks.
- **Headers & Footers**: Visual editor for print margins.
- **Print Titles**: Repeating rows/columns on every printed page.
- **Scale to Fit**: Scaling content to 1 page width.

## 6. Integrations & Compatibility

### Macros & Scripting
- **VBA Compatibility**: The decision to not support VBA is documented, but a migration strategy or "VBA parser" (to at least read/warn) is a gap for legacy file compatibility.
- **Office Scripts**: JSON/TypeScript based automation compatibility.

### File Formats
- **Binary formats**: `.xls` (BIFF8) or `.xlsb` (Binary Workbook) support is not mentioned (usually out of scope, but worth noting).
- **Template files**: `.xltx` support.

## 7. Accessibility & Internationalization

### Localization (i18n)
- **RTL Support**: Right-to-left sheet layout for languages like Arabic/Hebrew (mirrors UI and column order).
- **Formula Translation**: localized function names (e.g., `SOMME` instead of `SUM` in French) or argument separators (`;` vs `,`).

## Summary of Critical Gaps
1.  **Paste Special**: High frequency usage, critical for productivity.
2.  **Find & Replace**: Essential navigation tool.
3.  **External Links**: Major architectural challenge if required.
4.  **Rich Text**: Common in imported files.
5.  **Grouping/Outlining**: Standard for financial models.

## Gap Resolution (Applied to Plan)
The following gaps are now mapped into the post-MVP plan/backlog:
- Formula gaps (LET/LAMBDA, 3D refs, external links, array constants, range ops, dynamic helpers) -> `docs/11-post-mvp-plan.md` Phase 1 and `docs/12-post-mvp-backlog.md` (P1-5 to P1-8).
- UX gaps (Paste Special, Find & Replace, Go To Special, Trace precedents/dependents) -> `docs/12-post-mvp-backlog.md` (P11-1 to P11-4).
- Rich text + hyperlinks -> `docs/11-post-mvp-plan.md` Phase 2 and `docs/12-post-mvp-backlog.md` (P2-4).
- Data tools (Goal Seek, Solver, data tables, grouping/subtotals/consolidate) -> `docs/11-post-mvp-plan.md` Phase 5 and `docs/12-post-mvp-backlog.md` (P5-4, P5-5).
- View/print (split panes, custom views, page breaks, headers/footers, print titles, scale) -> `docs/12-post-mvp-backlog.md` (P12-1 to P12-4).
- Objects (images, shapes, text boxes) -> `docs/12-post-mvp-backlog.md` (P13-1 to P13-3).
- Chart advanced (secondary axis, error bars, dynamic titles) -> `docs/12-post-mvp-backlog.md` (P4-3, P4-4).
- Compatibility/i18n (localized formulas, RTL) -> `docs/12-post-mvp-backlog.md` (P14-1, P14-2).
- Legacy/VBA/Office Scripts -> included as optional in `docs/11-post-mvp-plan.md` and `docs/12-post-mvp-backlog.md` (P6-4, P6-5; P8-5).
