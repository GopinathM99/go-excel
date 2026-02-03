# 07 Risks and Pre-Development Decisions

## Key risks
- XLSX compatibility is complex and large in scope.
- Formula engine correctness and performance.
- UI performance on very large sheets.
- Collaboration conflict resolution complexity.

## Mitigations
- Stage XLSX support and build a compatibility test suite early.
- Invest in robust formula unit tests and fuzzing.
- Virtualized grid with incremental rendering and batching.
- Prototype CRDT/OT early with realistic operations.

## Pre-development decisions checklist
- Engine language: TypeScript vs Rust/Go + WASM.
- Collaboration model: CRDT vs OT.
- Grid rendering: DOM virtualization vs canvas.
- XLSX strategy: build parser or use library.
- Desktop packaging: Electron vs Tauri.

## Proposed tech stack decisions (default)
- Engine language: TypeScript (shared across web and desktop for fastest iteration).
- Collaboration model: CRDT (offline edits and robust merge behavior).
- Grid rendering: DOM virtualization first, add canvas layer if perf requires.
- XLSX strategy: use a mature library for v1, add custom fallbacks for edge cases.
- Desktop packaging: Electron for broad compatibility and ecosystem maturity.

## Alternatives and tradeoffs
- Engine language: Rust/Go + WASM for performance, but higher integration complexity.
- Collaboration model: OT simplifies server logic, but requires strict transforms.
- Grid rendering: Canvas can improve perf on huge sheets, but reduces native text editing.
- XLSX strategy: custom parser gives full control, but large implementation cost.
- Desktop packaging: Tauri for smaller binaries and security, but more setup friction.

## Concrete library candidates (shortlist)
- XLSX parsing/writing: SheetJS (xlsx), ExcelJS, or a custom parser if you need advanced fidelity.
- CRDT: Yjs or Automerge (Yjs has strong ecosystem for text/collab).
- OT (if chosen): ShareDB with a custom OT type for spreadsheet operations.
- Grid rendering: Hypergrid-style custom virtualized grid, or integrate an existing grid like Handsontable or AG Grid (evaluate licensing).
- Charts: ECharts, Highcharts, or Chart.js (license requirements differ).
- Rich text editing: ProseMirror or Slate (for comments/notes and rich cell editing if needed).
- Desktop packaging: Electron (mature) or Tauri (leaner).

## Licensing notes (verify early)
- Some grid/chart libraries are commercial for advanced features.
- Prefer permissive licenses (MIT/Apache-2.0) for core components.

## Dependencies to choose
- Chart library (if not custom).
- XLSX library or custom parser.
- CRDT/OT library (if using off-the-shelf).

## Staffing considerations
- Core engine: 1-2 engineers.
- Frontend UI: 1-2 engineers.
- Collaboration backend: 1 engineer.
- QA automation: 1 engineer.
