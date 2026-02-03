# 09 Backlog Lanes (Web vs Desktop)

This document splits the MVP backlog into web and desktop lanes. Shared items appear in both lanes with a single implementation in the shared core.

## Web lane (collaboration required)

### Core engine (shared)
- A1 Virtualized grid renderer
- A2 Cell selection and navigation
- A3 In-cell editing + formula bar
- A4 Undo/redo engine
- B1 Formula parser (grammar + AST)
- B2 Evaluator and dependency graph
- B3 Core function library v1
- C1 Basic cell formatting
- C2 Number format support
- D1 Sort and filter
- D2 Data validation
- E1 CSV import/export
- E2 XLSX import/export (basic)
- F1 Basic chart types
- I1 Formula test suite
- I2 Performance benchmarks

### Web-specific
- G1 Realtime sync server
- G2 CRDT integration
- G3 Presence and comments

## Desktop lane (offline-first)

### Core engine (shared)
- A1 Virtualized grid renderer
- A2 Cell selection and navigation
- A3 In-cell editing + formula bar
- A4 Undo/redo engine
- B1 Formula parser (grammar + AST)
- B2 Evaluator and dependency graph
- B3 Core function library v1
- C1 Basic cell formatting
- C2 Number format support
- D1 Sort and filter
- D2 Data validation
- E1 CSV import/export
- E2 XLSX import/export (basic)
- F1 Basic chart types
- I1 Formula test suite
- I2 Performance benchmarks

### Desktop-specific
- H1 Desktop shell

## Notes
- Collaboration epic only applies to web.
- Desktop focuses on local file IO and offline workflows.
- The shared core should be a separate package to ensure consistent behavior.
