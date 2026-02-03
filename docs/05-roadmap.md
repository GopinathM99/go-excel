# 05 Roadmap

## Phase 0 - Definition
- Confirm scope and MVP feature list.
- Choose tech stack for shared engine and UI.
- Decide CRDT vs OT for collaboration.
- Build UX wireframes for grid, formula bar, chart editor.

## Phase 1 - MVP Grid and Core
- Virtualized grid rendering
- Cell editing, selection, clipboard basics
- Basic formatting and number formats
- Basic formulas and SUM/AVERAGE
- CSV import/export

## Phase 2 - Formula Engine Expansion
- Parser with full Excel-like grammar
- Dependency graph and incremental recalculation
- Error handling and circular refs
- Expand function library (IF, LOOKUP, DATE/TIME)

## Phase 3 - Data Tools and Tables
- Sort/filter
- Data validation
- Named ranges and tables
- Conditional formatting (basic rules)

## Phase 4 - XLSX Compatibility
- XLSX read/write
- Style and number format mapping
- Compatibility test suite

## Phase 5 - Charts and Visualization
- Core chart types
- Chart editor UI
- Chart export

## Phase 6 - Collaboration (Web)
- Real-time sync server
- Presence and comments
- Version history

## Phase 7 - Desktop Packaging
- Electron or Tauri integration
- Local file system open/save
- Offline mode and optional sync
