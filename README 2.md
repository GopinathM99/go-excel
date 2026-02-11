# MS Excel Clone

A full-featured spreadsheet application for web and desktop, built with TypeScript, React, and Electron. Targets Excel-class functionality with real-time collaboration, a robust formula engine, and high-performance virtualized rendering.

## Features

**Core Spreadsheet**

- Workbooks with multiple sheets (reorder, rename, hide, color tabs)
- Cell editing with formula bar, selection overlays, and clipboard support
- Row/column insert, delete, resize, and auto-fit
- Undo/redo with grouped operations
- Named ranges and structured references

**Formula Engine**

- Excel-compatible parser with full operator precedence
- Dependency graph with incremental dirty-cell recalculation
- 40+ built-in functions across math, stats, logical, text, and date/time categories
- Error handling (`#DIV/0!`, `#REF!`, `#VALUE!`, `#NAME?`, `#N/A`)
- Circular reference detection

**Formatting & Data Tools**

- Fonts, colors, borders, alignment, wrap, number formats
- Conditional formatting (basic rules and color scales)
- Sorting (multi-column), filtering, data validation (dropdown, numeric, date)
- Tables with header rows and filter rows

**Charts & Visualization**

- Bar, line, area, pie, scatter, and combo charts (via ECharts)
- Chart editor with titles, labels, legends, and axis settings

**Collaboration (Web)**

- Real-time multi-user editing powered by Yjs (CRDT)
- Presence indicators, comments/threads, and version history

**File Compatibility**

- XLSX import/export (via ExcelJS)
- CSV/TSV import/export

**Desktop**

- Electron-based desktop app with local file system integration
- Offline mode with optional cloud sync

## Tech Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Language        | TypeScript (ES2022, strict mode)    |
| Frontend        | React 18, Vite 5, Zustand           |
| Charts          | ECharts                             |
| Desktop         | Electron 28                         |
| Collaboration   | Yjs, y-websocket, WebSocket server  |
| File I/O        | ExcelJS (XLSX), custom CSV handler  |
| Testing         | Vitest, Playwright, Testing Library |
| Linting         | ESLint 9, Prettier                  |
| Package Manager | pnpm 9 (workspaces)                 |

## Project Structure

```
ms-excel/
├── packages/
│   ├── shared/       # Shared types, utils, and constants
│   ├── core/         # Workbook model, formula engine, commands, I/O
│   │   └── src/
│   │       ├── models/       # Cell, Sheet, Workbook, CellAddress, CellRange
│   │       ├── formula/      # Lexer, Parser, AST, Evaluator, DependencyGraph
│   │       ├── commands/     # Command pattern for undo/redo
│   │       ├── history/      # UndoManager
│   │       ├── charts/       # Chart types and model
│   │       ├── collab/       # CRDT collaboration logic
│   │       └── io/           # CsvHandler, XLSX support
│   ├── web/          # React SPA with virtualized grid
│   │   └── src/
│   │       └── components/
│   │           ├── Grid/         # VirtualGrid, CellEditor, SelectionOverlay, Resizers
│   │           ├── Toolbar.tsx
│   │           ├── FormulaBar.tsx
│   │           ├── SheetTabs.tsx
│   │           └── Spreadsheet.tsx
│   ├── server/       # WebSocket collaboration server
│   └── desktop/      # Electron shell
├── docs/             # Design docs, roadmap, backlog, sprint plans
├── implementation/   # Phase-by-phase implementation guides
└── package.json      # Root workspace config
```

## Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd ms-excel

# Install dependencies
pnpm install

# Start the web dev server
pnpm dev

# Start the desktop app (in a separate terminal)
pnpm dev:desktop
```

## Scripts

| Command              | Description                                 |
| -------------------- | ------------------------------------------- |
| `pnpm dev`           | Start the web app dev server                |
| `pnpm dev:desktop`   | Start the Electron desktop app              |
| `pnpm build`         | Build all packages                          |
| `pnpm build:web`     | Build the web app only                      |
| `pnpm build:desktop` | Build the desktop app only                  |
| `pnpm test`          | Run all tests                               |
| `pnpm test:unit`     | Run core engine unit tests                  |
| `pnpm test:e2e`      | Run Playwright end-to-end tests             |
| `pnpm lint`          | Lint all packages                           |
| `pnpm lint:fix`      | Lint and auto-fix                           |
| `pnpm format`        | Format code with Prettier                   |
| `pnpm format:check`  | Check formatting                            |
| `pnpm typecheck`     | Run TypeScript type checking                |
| `pnpm clean`         | Remove all build artifacts and node_modules |

## Architecture

The project follows a monorepo structure with a shared core engine consumed by both the web and desktop frontends.

```
┌─────────────┐   ┌─────────────┐
│   Web App   │   │ Desktop App │
│  (React)    │   │ (Electron)  │
└──────┬──────┘   └──────┬──────┘
       │                 │
       └────────┬────────┘
                │
       ┌────────┴────────┐
       │   @excel/core   │
       │  (shared engine) │
       └────────┬────────┘
                │
       ┌────────┴────────┐
       │  @excel/shared  │
       │ (types & utils) │
       └─────────────────┘
```

- **@excel/shared** -- Common types, constants, and utility functions
- **@excel/core** -- Platform-agnostic spreadsheet engine (models, formulas, commands, I/O, collaboration)
- **@excel/web** -- React-based web UI with virtualized grid rendering
- **@excel/server** -- WebSocket server for real-time collaboration via Yjs
- **@excel/desktop** -- Electron wrapper with local file system access

## Performance Targets

- Open a 1M-cell workbook in under 3 seconds
- 60fps scrolling with virtualized rendering
- Incremental recalculation via dependency graph (only dirty cells recompute)

## Roadmap

| Phase   | Focus                                                      |
| ------- | ---------------------------------------------------------- |
| Phase 0 | Project setup, tech stack, wireframes                      |
| Phase 1 | MVP grid, cell editing, basic formulas, CSV I/O            |
| Phase 2 | Formula engine expansion, dependency graph, error handling |
| Phase 3 | Data tools, tables, conditional formatting                 |
| Phase 4 | XLSX compatibility                                         |
| Phase 5 | Charts and visualization                                   |
| Phase 6 | Real-time collaboration (web)                              |
| Phase 7 | Desktop packaging and offline mode                         |

See [`docs/`](./docs/) for detailed design documents, backlog, and sprint plans.
