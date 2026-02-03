# 10 Sprint Plan (Dependency-Aware)

Assumes 2-week sprints and a shared core built first, then web collaboration and desktop packaging.

## Sprint 1: Grid foundations
- A1 Virtualized grid renderer (P0)
- A2 Cell selection and navigation (P0)
- A3 In-cell editing + formula bar (P0)

## Sprint 2: Core behaviors
- A4 Undo/redo engine (P0)
- B1 Formula parser (P0)
- E1 CSV import/export (P0)

## Sprint 3: Calculation core
- B2 Evaluator and dependency graph (P0)
- B3 Core function library v1 (P0)
- I1 Formula test suite (P0)

## Sprint 4: File compatibility + formatting
- C1 Basic cell formatting (P1)
- C2 Number format support (P1)
- E2 XLSX import/export (P0)

## Sprint 5: Data tools + performance
- D1 Sort and filter (P1)
- D2 Data validation (P1)
- I2 Performance benchmarks (P1)

## Sprint 6: Charts
- F1 Basic chart types (P2)

## Sprint 7-8: Collaboration MVP (web)
- G1 Realtime sync server (P0)
- G2 CRDT integration (P0)
- G3 Presence and comments (P1)

## Sprint 9: Desktop shell
- H1 Desktop shell (P1)

## Notes
- Reorder sprints as needed if collaboration is a top priority.
- XLSX import/export may expand beyond a single sprint depending on chosen library.
- Charts can shift later if core stability is the priority.
