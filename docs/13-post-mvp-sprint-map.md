# 13 Post-MVP Sprint Map (High-Level)

Assumes 2-week sprints and a stable MVP baseline. This map groups the post-MVP epics into logical waves. Reorder based on business priority.

## Wave 1: Formula depth and correctness (Sprints 1-3)
- P1 Formula and Function Parity
  - P1-1 Financial functions
  - P1-2 Advanced statistical functions
  - P1-3 Dynamic array functions
  - P1-4 Volatile functions and calc modes
  - P1-5 LET and LAMBDA support
  - P1-6 Dynamic array helper functions
  - P1-7 3D references and external links
  - P1-8 Array constants and range operators

## Wave 2: Formatting and XLSX fidelity (Sprints 4-6)
- P2 Advanced Formatting and Styles
  - P2-1 Advanced conditional formatting
  - P2-2 Custom number formats
  - P2-3 Theme and style fidelity
  - P2-4 Rich text and hyperlinks in cells
- P8 XLSX Parity (start)
  - P8-1 Advanced style and metadata support

## Wave 3: Pivot tables and advanced data tools (Sprints 7-10)
- P3 Pivot Tables and Pivot Charts
  - P3-1 Pivot cache layer
  - P3-2 Pivot table UI builder
  - P3-3 Pivot charts
- P5 Advanced Data Tools (start)
  - P5-1 Import pipeline (Power Query lite)
  - P5-2 Data cleanup utilities
  - P5-4 What-if analysis tools
  - P5-5 Grouping, subtotals, consolidate

## Wave 4: Advanced charts and data tools (Sprints 11-13)
- P4 Advanced Charts
  - P4-1 Extended chart types
  - P4-2 Trendlines and annotations
  - P4-3 Secondary axis and error bars
  - P4-4 Dynamic chart titles
- P5 Advanced Data Tools (finish)
  - P5-3 Slicers and advanced filters

## Wave 5: Automation and extensibility (Sprints 14-16)
- P6 Automation and Extensibility
  - P6-1 Custom function framework (UDF)
  - P6-2 Macro engine
  - P6-3 Add-in/plugin API
  - P6-4 Office Scripts compatibility (optional)
  - P6-5 VBA import warnings or parser (optional)

## Wave 6: Collaboration advanced + performance (Sprints 17-20)
- P7 Collaboration Advanced
  - P7-1 Range-level permissions
  - P7-2 Change tracking and approvals
  - P7-3 Offline edits and merge
- P9 Performance and Scale
  - P9-1 Multi-threaded calculation
  - P9-2 Memory-optimized grid storage

## Wave 7: Editing UX, objects, and view/print (Sprints 21-24)
- P11 Advanced Editing UX
  - P11-1 Paste Special
  - P11-2 Find & Replace
  - P11-3 Go To Special
  - P11-4 Trace precedents/dependents
- P13 Objects and Drawing
  - P13-1 Images on grid
  - P13-2 Shapes and connectors
  - P13-3 Text boxes
- P12 View, Layout, and Print
  - P12-1 Split panes and new window
  - P12-2 Custom views
  - P12-3 Print layout and page breaks
  - P12-4 Headers, footers, and print titles

## Wave 8: Platform polish + XLSX parity closeout (Sprints 25-27)
- P10 Platform Polish
  - P10-1 Desktop OS integrations
  - P10-2 Web PWA + offline
  - P10-3 Accessibility and localization
- P8 XLSX Parity (finish)
  - P8-2 Complex conditional formatting and rules
  - P8-3 Pivot and chart compatibility
  - P8-4 Template file support (.xltx)
  - P8-5 Legacy binary formats (.xls/.xlsb)
- P14 Compatibility and Localization
  - P14-1 Localized formula names and separators
  - P14-2 RTL layout support

## Notes
- Each wave should include regression testing and XLSX round-trip validation.
- Use feature flags for automation, advanced pivots, and offline merges.
- Adjust sprint counts based on team size and complexity.
