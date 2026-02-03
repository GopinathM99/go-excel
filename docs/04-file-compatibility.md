# 04 File Compatibility

## Formats to support
- XLSX import and export
- CSV/TSV import and export

## XLSX support plan
- Phase 1: basic worksheets, cell values, formulas, basic styles
- Phase 2: extended styles, conditional formatting, charts
- Phase 3: pivot tables and advanced features

## XLSX mapping considerations
- Cell references and ranges must map to internal grid model.
- Styles map to a common style schema (font, color, borders, number format).
- Formulas map to the internal formula engine with function coverage.

## CSV/TSV
- Support custom delimiters and quoting rules.
- Locale-aware parsing for decimals and dates.

## Compatibility test suite
- Create a corpus of XLSX files for common scenarios:
  - Multi-sheet, formulas, merged cells
  - Number formats and date handling
  - Charts and conditional formatting
- Round-trip tests: import -> edit -> export -> compare results

## Known limitations to document
- Unsupported formulas or features must degrade gracefully.
- Unsupported styles should be preserved when possible during round-trip.
