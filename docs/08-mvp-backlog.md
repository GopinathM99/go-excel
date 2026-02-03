# 08 MVP Backlog

This backlog is structured as epics with tickets. Each ticket includes goal and acceptance criteria.

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

## Epic A: Core Grid and Editing

- ID: A1
- Title: Virtualized grid renderer
- Epic: Core Grid and Editing
- Goal: Render large sheets efficiently.
- Scope: Row/column virtualization, fixed headers.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - 100k rows scroll smoothly on modern laptop.
  - Headers stay aligned during scroll.
- Dependencies: none
- Notes: Start with DOM virtualization.

- ID: A2
- Title: Cell selection and navigation
- Epic: Core Grid and Editing
- Goal: Keyboard and mouse selection.
- Scope: Single, range, multi-range selection; arrow key navigation.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Shift + arrow expands selection.
  - Ctrl + click adds range.
- Dependencies: A1

- ID: A3
- Title: In-cell editing + formula bar
- Epic: Core Grid and Editing
- Goal: Edit cell values and formulas.
- Scope: Cell edit mode, formula bar input, commit/cancel.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Enter commits, Esc cancels.
  - Formula bar and cell editor stay in sync.
- Dependencies: A2

- ID: A4
- Title: Undo/redo engine
- Epic: Core Grid and Editing
- Goal: Reversible operations.
- Scope: Command stack for cell edits and range operations.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Undo/redo for single and bulk paste.
- Dependencies: A3

## Epic B: Formula Engine (MVP)

- ID: B1
- Title: Formula parser (grammar + AST)
- Epic: Formula Engine
- Goal: Parse Excel-like formulas.
- Scope: Operators, parentheses, cell refs, ranges, function calls.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Parses =SUM(A1:A3) and =A1+B2*3.
- Dependencies: A3

- ID: B2
- Title: Evaluator and dependency graph
- Epic: Formula Engine
- Goal: Recalculate dependent cells correctly.
- Scope: Dependency graph, dirty propagation.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Updates dependent cells on change.
  - Detects circular refs.
- Dependencies: B1

- ID: B3
- Title: Core function library v1
- Epic: Formula Engine
- Goal: Implement common functions.
- Scope: SUM, AVERAGE, MIN, MAX, IF, AND, OR, COUNT, COUNTIF.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Matches Excel results for basic cases.
- Dependencies: B2

## Epic C: Formatting and Styles

- ID: C1
- Title: Basic cell formatting
- Epic: Formatting and Styles
- Goal: Visual formatting controls.
- Scope: font, size, color, alignment, wrap.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Formatting persists on save/load.
- Dependencies: A3

- ID: C2
- Title: Number format support
- Epic: Formatting and Styles
- Goal: Common number formats.
- Scope: general, number, currency, percent, date.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Display changes without altering raw values.
- Dependencies: A3

## Epic D: Data Tools

- ID: D1
- Title: Sort and filter
- Epic: Data Tools
- Goal: Basic data tools.
- Scope: single and multi-column sort; basic filter.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Sorting stable and reversible via undo.
- Dependencies: A4

- ID: D2
- Title: Data validation
- Epic: Data Tools
- Goal: Validate input.
- Scope: list dropdown, numeric limits.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Invalid entries show error UI.
- Dependencies: A3

## Epic E: File Import/Export

- ID: E1
- Title: CSV import/export
- Epic: File Import/Export
- Goal: Basic file IO.
- Scope: parse CSV with quotes/commas, export with delimiter.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Round-trip preserves values and row/column count.
- Dependencies: A3

- ID: E2
- Title: XLSX import/export (basic)
- Epic: File Import/Export
- Goal: Excel file compatibility for common cases.
- Scope: sheets, values, formulas, basic styles.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Open common XLSX and re-export without data loss.
- Dependencies: B3, C1, C2

## Epic F: Charts (MVP)

- ID: F1
- Title: Basic chart types
- Epic: Charts
- Goal: Visualize ranges.
- Scope: bar and line charts.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P2
- Acceptance criteria:
  - Chart updates on source range edits.
- Dependencies: B2, A3

## Epic G: Collaboration (Web MVP)

- ID: G1
- Title: Realtime sync server
- Epic: Collaboration
- Goal: Real-time updates.
- Scope: WebSocket server, room sessions.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Multiple clients see edits under 200ms on LAN.
- Dependencies: A3

- ID: G2
- Title: CRDT integration
- Epic: Collaboration
- Goal: Conflict-free multi-user edits.
- Scope: CRDT document model and merge logic.
- Estimate (S/M/L): L
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - Concurrent edits resolve deterministically.
- Dependencies: G1

- ID: G3
- Title: Presence and comments
- Epic: Collaboration
- Goal: Awareness features.
- Scope: cursors, selections, comment threads.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Users see each other’s selections.
- Dependencies: G2

## Epic H: Desktop Packaging

- ID: H1
- Title: Desktop shell
- Epic: Desktop Packaging
- Goal: Desktop app wrapper.
- Scope: Electron or Tauri shell, menu and shortcuts.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Open local file and save works.
- Dependencies: E1

## Epic I: Quality and Performance

- ID: I1
- Title: Formula test suite
- Epic: Quality and Performance
- Goal: Validate correctness.
- Scope: unit tests for parser and functions.
- Estimate (S/M/L): M
- Priority (P0/P1/P2): P0
- Acceptance criteria:
  - 90% coverage on formula module.
- Dependencies: B3

- ID: I2
- Title: Performance benchmarks
- Epic: Quality and Performance
- Goal: Track scroll and recalc performance.
- Scope: perf harness with large sheets.
- Estimate (S/M/L): S
- Priority (P0/P1/P2): P1
- Acceptance criteria:
  - Baseline metrics stored and reported.
- Dependencies: A1, B2
