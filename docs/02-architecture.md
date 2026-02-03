# 02 Architecture

## Architectural goals
- One shared core engine for web and desktop.
- Web supports collaboration; desktop supports offline work.
- Consistent formula results across platforms.

## High-level components
- Core engine (shared)
  - Workbook model
  - Formula parser and evaluator
  - Dependency graph + recalculation engine
  - Serialization (XLSX/CSV)
  - Formatting and styles
- Web app
  - Virtualized grid renderer
  - Collaborative editing UI
  - Chart and pivot editors
- Collaboration services
  - Real-time sync server (CRDT or OT)
  - Presence and comments service
  - Version history storage
- Desktop app
  - Electron or Tauri shell
  - Local file system integration
  - Optional sync when online

## Core engine detail
- Data model
  - Workbook -> Sheets -> Grid -> Cells
  - Cell contains: value, formula, style, validation, metadata
  - Range abstraction for multi-cell operations
- Formula engine
  - Parser -> AST -> evaluator
  - Function registry with metadata (arity, volatility, array behavior)
  - Dependency graph for recalculation
- Recalc strategy
  - Track dirty cells when inputs change
  - Topological order evaluation for affected nodes
  - Batch updates for range operations
- Serialization
  - XLSX: parse sharedStrings, sheet XML, styles, formulas
  - CSV: streaming parser and writer

## UI rendering strategy
- Virtualized grid for large sheets
- Layered rendering: grid, selection, headers, overlays
- Edit state separated from render state

## Deployment model
- Web: static frontend + realtime backend + file storage
- Desktop: packaged app with local storage and optional cloud sync
