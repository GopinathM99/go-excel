# Parallel Development Guide

This document outlines which tasks can be executed in parallel using sub-agents, which must be sequential, and the dependencies between phases and tasks.

---

## Current Status

**Last Updated:** 2024-01-31

**Completed Phases:**
- ✅ Phase 0: Project Setup & Foundation
- ✅ Phase 1: Grid Foundation
- ✅ Phase 2: Core Behaviors (Undo/Redo, Formula Parser, CSV)
- ✅ Phase 3: Calculation Core (Dependency Graph, Evaluator, Functions)

**Completed Phases (Batch 3 Complete):**
- ✅ Phase 4: File Compatibility & Formatting - **Complete**
- ✅ Phase 5: Data Tools & Performance - **Complete**
- ✅ Phase 6: Charts - **Complete**
- ✅ Phase 7-8: Real-Time Collaboration - **Complete**
- ✅ Phase 8: Desktop Shell - **Complete**

**MVP Complete:**
- ✅ Phase 9: MVP Polish & QA

---

## Batch 1 Completion Summary (2024-01-31)

| Agent | Task | Workstream | Status | Tests |
|-------|------|------------|--------|-------|
| 1 | Cell Formatting + Number Formats | A | ✅ Complete | 172 |
| 2 | Multi-Column Sorter | B | ✅ Complete | 25+ |
| 3 | Auto-Filter | B | ✅ Complete | 30+ |
| 4 | Data Validation | B | ✅ Complete | 53 |
| 5 | Chart Model + Data Provider | C | ✅ Complete | 105 |
| 6 | WebSocket Server + Rooms | D | ✅ Complete | Working |
| 7 | Electron Main + Preload | E | ✅ Complete | Setup done |

---

## Batch 2 Completion Summary (2024-01-31)

| Agent | Task | Workstream | Status | Tests |
|-------|------|------------|--------|-------|
| 1 | XLSX Import | A | ✅ Complete | 52 |
| 2 | XLSX Export | A | ✅ Complete | 38 |
| 3 | Sort Dialog UI | B | ✅ Complete | - |
| 4 | Filter Dropdown UI | B | ✅ Complete | - |
| 5 | Validation Dialog UI | B | ✅ Complete | - |
| 6 | Chart Components (ECharts) | C | ✅ Complete | - |
| 7 | CRDT Yjs Binding | D | ✅ Complete | 45 |
| 8 | Comments Model | D | ✅ Complete | 78 |
| 9 | Offline Mode | E | ✅ Complete | - |

### Files Created in Batch 2

**Workstream A (XLSX):**
- `packages/core/src/io/XlsxReader.ts` - Full XLSX import with styles/formulas
- `packages/core/src/io/XlsxWriter.ts` - Full XLSX export with round-trip fidelity

**Workstream B (Data Tools UI):**
- `packages/web/src/components/Sort/SortDialog.tsx` - Multi-level sort dialog
- `packages/web/src/components/Sort/SortLevel.tsx` - Individual sort level
- `packages/web/src/components/Filter/FilterDropdown.tsx` - Header filter button
- `packages/web/src/components/Filter/FilterMenu.tsx` - Filter menu with tabs
- `packages/web/src/components/Filter/FilterCondition.tsx` - Condition builder
- `packages/web/src/components/Validation/ValidationDialog.tsx` - Main dialog
- `packages/web/src/components/Validation/ValidationDropdown.tsx` - In-cell dropdown
- `packages/web/src/components/Validation/ValidationError.tsx` - Error popups
- `packages/web/src/hooks/useSort.ts` - Sort integration hook
- `packages/web/src/hooks/useFilter.ts` - Filter integration hook
- `packages/web/src/hooks/useValidation.ts` - Validation integration hook

**Workstream C (Charts UI):**
- `packages/web/src/components/Charts/ChartContainer.tsx` - Generic wrapper
- `packages/web/src/components/Charts/BarChart.tsx` - Bar/Column charts
- `packages/web/src/components/Charts/LineChart.tsx` - Line/Area charts
- `packages/web/src/components/Charts/PieChart.tsx` - Pie/Donut charts
- `packages/web/src/hooks/useChart.ts` - Chart integration hook

**Workstream D (Collaboration):**
- `packages/core/src/collab/YjsBinding.ts` - Yjs CRDT binding
- `packages/core/src/collab/AwarenessState.ts` - User presence tracking
- `packages/core/src/collab/ConflictResolver.ts` - Conflict handling
- `packages/core/src/collab/Comments.ts` - Comments data model

**Workstream E (Desktop):**
- `packages/desktop/src/main/offlineStorage.ts` - Local workbook storage
- `packages/desktop/src/main/recentFiles.ts` - Recent files tracking
- `packages/desktop/src/main/autoSave.ts` - Auto-save and recovery
- `packages/desktop/src/preload/offlineApi.ts` - Offline API bridge
- `packages/desktop/src/main/offlineIpc.ts` - IPC handlers

### Files Created in Batch 1

**Workstream A (Formatting):**
- `packages/core/src/styles/NumberFormatter.ts` - Full number format support
- `packages/core/src/styles/StyleManager.ts` - 20+ named styles, style operations
- `packages/core/src/models/CellStyle.ts` - Enhanced with full style properties

**Workstream B (Data Tools):**
- `packages/core/src/data/Sorter.ts` - Multi-column sort with natural sort
- `packages/core/src/data/Filter.ts` - Auto-filter with 18 operators
- `packages/core/src/data/Validation.ts` - 8 validation types
- `packages/core/src/data/index.ts` - Module exports

**Workstream C (Charts):**
- `packages/core/src/charts/ChartTypes.ts` - Type definitions
- `packages/core/src/charts/ChartModel.ts` - Chart configuration
- `packages/core/src/charts/ChartDataProvider.ts` - Data extraction
- `packages/core/src/charts/ChartManager.ts` - Chart collection management
- `packages/core/src/charts/index.ts` - Module exports

**Workstream D (Collaboration):**
- `packages/server/package.json` - Server package config
- `packages/server/src/index.ts` - Entry point
- `packages/server/src/websocket/WebSocketServer.ts` - CollaborationServer class
- `packages/server/src/websocket/MessageHandler.ts` - Message protocol
- `packages/server/src/rooms/Room.ts` - Room with Yjs document
- `packages/server/src/rooms/RoomManager.ts` - Room lifecycle
- `packages/server/src/persistence/DocumentStore.ts` - Memory storage

**Workstream E (Desktop):**
- `packages/desktop/package.json` - Desktop package config
- `packages/desktop/electron-builder.json` - Build configuration
- `packages/desktop/src/main/index.ts` - Main process
- `packages/desktop/src/main/menu.ts` - Application menu
- `packages/desktop/src/main/ipc.ts` - IPC handlers
- `packages/desktop/src/main/window.ts` - Window management
- `packages/desktop/src/preload/index.ts` - Context bridge

---

## Parallel Workstreams

After Phase 3, the remaining work can be organized into **5 independent workstreams** that can run in parallel:

```
                            ┌─────────────────────────────────────────────────────┐
                            │             PHASE 3 COMPLETE (NOW)                   │
                            └─────────────────────────────────────────────────────┘
                                                    │
        ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
        │                   │                       │                       │                   │
        ▼                   ▼                       ▼                       ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  WORKSTREAM A │   │  WORKSTREAM B │   │  WORKSTREAM C │   │  WORKSTREAM D │   │  WORKSTREAM E │
│   Formatting  │   │  Data Tools   │   │    Charts     │   │ Collaboration │   │    Desktop    │
│     & XLSX    │   │               │   │               │   │    (Server)   │   │     Shell     │
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼                   │
    Phase 4            Phase 5             Phase 6           Phase 7-8               │
  ┌─────────┐        ┌─────────┐         ┌─────────┐       ┌──────────┐              │
  │Formatting│        │ Sorter  │         │ Chart   │       │  Server  │              │
  │  (core)  │        │         │         │  Model  │       │  Setup   │              │
  └─────────┘        └─────────┘         └─────────┘       └──────────┘              │
        │                   │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼                   │
  ┌─────────┐        ┌─────────┐         ┌─────────┐       ┌──────────┐              │
  │ Number  │        │ Filter  │         │ Chart   │       │   CRDT   │              │
  │ Formats │        │         │         │  Types  │       │ Binding  │              │
  └─────────┘        └─────────┘         └─────────┘       └──────────┘              │
        │                   │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼                   │
  ┌─────────┐        ┌─────────┐         ┌─────────┐       ┌──────────┐              │
  │  XLSX   │        │Validation│         │ Chart   │       │ Presence │              │
  │Import/Ex│        │         │         │   UI    │       │& Comments│              │
  └─────────┘        └─────────┘         └─────────┘       └──────────┘              │
        │                   │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼                   │
  ┌─────────┐        ┌─────────┐               │                   │                   │
  │ Format  │        │  Perf   │               │                   │                   │
  │   UI    │        │Benchmarks│              │                   │                   │
  └─────────┘        └─────────┘               │                   │                   │
        │                   │                   │                   │                   │
        └───────────────────┴───────────────────┴───────────────────┴───────────────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │      Phase 8          │
                                    │   Desktop Shell       │◄─────────── Needs XLSX from
                                    │   (Full Features)     │             Workstream A
                                    └───────────────────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │      Phase 9          │
                                    │   MVP Polish & QA     │
                                    └───────────────────────┘
```

---

## Workstream Details

### Workstream A: Formatting & XLSX (Phase 4)
**Status:** 🟡 In Progress
**Dependencies:** Uses existing Cell, Sheet, Workbook models
**Sub-agent Type:** `general-purpose`

| Task | Priority | Dependencies | Status |
|------|----------|--------------|--------|
| A1: Cell Formatting (core) | P0 | CellStyle model | ✅ Complete (172 tests) |
| A2: Number Formats | P0 | Cell model | ✅ Complete (included in A1) |
| A3: XLSX Import | P1 | A1, A2 complete | ✅ Complete (52 tests) |
| A4: XLSX Export | P1 | A1, A2 complete | ✅ Complete (38 tests) |
| A5: Format Toolbar UI | P2 | A1-A4 complete | ✅ Complete |

**Completed Files:**
- `packages/core/src/styles/NumberFormatter.ts`
- `packages/core/src/styles/StyleManager.ts`
- `packages/core/src/models/CellStyle.ts` (enhanced)
- `packages/core/src/io/XlsxReader.ts`
- `packages/core/src/io/XlsxWriter.ts`

---

### Workstream B: Data Tools (Phase 5)
**Status:** 🟡 In Progress
**Dependencies:** Uses existing Sheet, CellRange models
**Sub-agent Type:** `general-purpose`

| Task | Priority | Dependencies | Status |
|------|----------|--------------|--------|
| B1: Multi-Column Sorter | P0 | Sheet model | ✅ Complete (25+ tests) |
| B2: Auto-Filter | P0 | Sheet model | ✅ Complete (30+ tests) |
| B3: Data Validation | P1 | Cell model | ✅ Complete (53 tests) |
| B4: Sort UI | P2 | B1 complete | ✅ Complete |
| B5: Filter UI | P2 | B2 complete | ✅ Complete |
| B6: Validation UI | P2 | B3 complete | ✅ Complete |
| B7: Performance Benchmarks | P1 | None | ✅ Complete |

**Completed Files:**
- `packages/core/src/data/Sorter.ts`
- `packages/core/src/data/Filter.ts`
- `packages/core/src/data/Validation.ts`
- `packages/core/src/data/index.ts`
- `packages/web/src/components/Sort/SortDialog.tsx`
- `packages/web/src/components/Sort/SortLevel.tsx`
- `packages/web/src/components/Filter/FilterDropdown.tsx`
- `packages/web/src/components/Filter/FilterMenu.tsx`
- `packages/web/src/components/Filter/FilterCondition.tsx`
- `packages/web/src/components/Validation/ValidationDialog.tsx`
- `packages/web/src/components/Validation/ValidationDropdown.tsx`
- `packages/web/src/components/Validation/ValidationError.tsx`
- `packages/web/src/hooks/useSort.ts`
- `packages/web/src/hooks/useFilter.ts`
- `packages/web/src/hooks/useValidation.ts`

---

### Workstream C: Charts (Phase 6)
**Status:** 🟡 In Progress
**Dependencies:** Uses CellRange, Evaluator for data extraction
**Sub-agent Type:** `general-purpose`

| Task | Priority | Dependencies | Status |
|------|----------|--------------|--------|
| C1: Chart Model | P0 | CellRange model | ✅ Complete (105 tests) |
| C2: Chart Data Provider | P0 | C1 complete | ✅ Complete (included in C1) |
| C3: Bar/Column Charts | P1 | C2 complete | ✅ Complete |
| C4: Line Charts | P1 | C2 complete | ✅ Complete |
| C5: Pie Charts | P1 | C2 complete | ✅ Complete |
| C6: Chart Editor UI | P2 | C3-C5 complete | ✅ Complete |

**Completed Files:**
- `packages/core/src/charts/ChartTypes.ts`
- `packages/core/src/charts/ChartModel.ts`
- `packages/core/src/charts/ChartDataProvider.ts`
- `packages/core/src/charts/ChartManager.ts`
- `packages/core/src/charts/index.ts`
- `packages/web/src/components/Charts/ChartContainer.tsx`
- `packages/web/src/components/Charts/BarChart.tsx`
- `packages/web/src/components/Charts/LineChart.tsx`
- `packages/web/src/components/Charts/PieChart.tsx`
- `packages/web/src/hooks/useChart.ts`

---

### Workstream D: Collaboration (Phase 7-8)
**Status:** 🟡 In Progress
**Dependencies:** Workbook/Sheet/Cell models for CRDT binding
**Sub-agent Type:** `general-purpose`

| Task | Priority | Dependencies | Status |
|------|----------|--------------|--------|
| D1: WebSocket Server | P0 | None | ✅ Complete |
| D2: Room Management | P0 | D1 complete | ✅ Complete (included in D1) |
| D3: Yjs CRDT Binding | P0 | D1 complete | ✅ Complete (45 tests) |
| D4: Awareness/Presence | P1 | D2, D3 complete | ✅ Complete (included in D3) |
| D5: Presence UI | P1 | D4 complete | ✅ Complete |
| D6: Comments Model | P1 | D2 complete | ✅ Complete (78 tests) |
| D7: Comments UI | P2 | D6 complete | ✅ Complete |
| D8: Version History | P2 | D2 complete | ✅ Complete (52 tests) |

**Completed Files:**
- `packages/server/src/index.ts`
- `packages/server/src/websocket/WebSocketServer.ts`
- `packages/server/src/websocket/MessageHandler.ts`
- `packages/server/src/rooms/Room.ts`
- `packages/server/src/rooms/RoomManager.ts`
- `packages/server/src/persistence/DocumentStore.ts`
- `packages/core/src/collab/YjsBinding.ts`
- `packages/core/src/collab/AwarenessState.ts`
- `packages/core/src/collab/ConflictResolver.ts`
- `packages/core/src/collab/Comments.ts`

---

### Workstream E: Desktop Shell (Phase 8)
**Status:** 🟡 In Progress
**Dependencies:** Web app, XLSX import/export for file dialogs
**Sub-agent Type:** `general-purpose`

| Task | Priority | Dependencies | Status |
|------|----------|--------------|--------|
| E1: Electron Main Process | P0 | None | ✅ Complete |
| E2: Preload Script | P0 | E1 complete | ✅ Complete |
| E3: Menu Bar | P1 | E1, E2 complete | ✅ Complete |
| E4: Native File Dialogs | P1 | E3 + **Workstream A (XLSX)** | ✅ Complete |
| E5: Recent Files | P1 | E4 complete | ✅ Complete (included in Offline) |
| E6: Offline Mode | P2 | E1-E3 complete | ✅ Complete |

**Completed Files:**
- `packages/desktop/package.json`
- `packages/desktop/electron-builder.json`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/menu.ts`
- `packages/desktop/src/main/ipc.ts`
- `packages/desktop/src/main/window.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/main/offlineStorage.ts`
- `packages/desktop/src/main/recentFiles.ts`
- `packages/desktop/src/main/autoSave.ts`
- `packages/desktop/src/preload/offlineApi.ts`
- `packages/desktop/src/main/offlineIpc.ts`

---

## Batch 1 Agents ✅ COMPLETE

All Batch 1 agents completed successfully on 2024-01-31:

### Agent 1: Formatting Core (Workstream A) ✅
- `packages/core/src/styles/NumberFormatter.ts`
- `packages/core/src/styles/StyleManager.ts`
- `packages/core/src/models/CellStyle.ts` (enhanced)
- 172 tests

### Agent 2: Sorter (Workstream B) ✅
- `packages/core/src/data/Sorter.ts`
- 25+ tests

### Agent 3: Filter (Workstream B) ✅
- `packages/core/src/data/Filter.ts`
- 30+ tests

### Agent 4: Data Validation (Workstream B) ✅
- `packages/core/src/data/Validation.ts`
- 53 tests

### Agent 5: Chart Model (Workstream C) ✅
- `packages/core/src/charts/ChartTypes.ts`
- `packages/core/src/charts/ChartModel.ts`
- `packages/core/src/charts/ChartDataProvider.ts`
- `packages/core/src/charts/ChartManager.ts`
- 105 tests

### Agent 6: Collaboration Server (Workstream D) ✅
- `packages/server/src/websocket/WebSocketServer.ts`
- `packages/server/src/rooms/Room.ts`
- `packages/server/src/rooms/RoomManager.ts`
- `packages/server/src/persistence/DocumentStore.ts`

### Agent 7: Desktop Shell (Workstream E) ✅
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/menu.ts`
- `packages/desktop/src/main/ipc.ts`
- `packages/desktop/src/preload/index.ts`

---

## Next Parallel Actions (Batch 2)

These can all be started **NOW** in parallel:

### Agent 1: XLSX Import (Workstream A)
```
Task: Implement XLSX import
Files:
- packages/core/src/io/XlsxReader.ts
Dependencies: Add 'exceljs' package
```

### Agent 2: XLSX Export (Workstream A)
```
Task: Implement XLSX export
Files:
- packages/core/src/io/XlsxWriter.ts
Dependencies: Add 'exceljs' package
```

### Agent 3: Sort UI (Workstream B)
```
Task: Create Sort dialog React component
Files:
- packages/web/src/components/Sort/SortDialog.tsx
- packages/web/src/components/Sort/index.tsx
```

### Agent 4: Filter UI (Workstream B)
```
Task: Create Filter dropdown React components
Files:
- packages/web/src/components/Filter/FilterDropdown.tsx
- packages/web/src/components/Filter/FilterMenu.tsx
```

### Agent 5: Validation UI (Workstream B)
```
Task: Create Validation dialog React components
Files:
- packages/web/src/components/Validation/ValidationDialog.tsx
- packages/web/src/components/Validation/ValidationDropdown.tsx
```

### Agent 6: Chart Components (Workstream C)
```
Task: Create Bar, Line, Pie chart React components with ECharts
Files:
- packages/web/src/components/Charts/BarChart.tsx
- packages/web/src/components/Charts/LineChart.tsx
- packages/web/src/components/Charts/PieChart.tsx
Dependencies: Add 'echarts' and 'echarts-for-react' packages
```

### Agent 7: CRDT Yjs Binding (Workstream D)
```
Task: Bind Yjs CRDT to spreadsheet data model
Files:
- packages/core/src/collab/YjsBinding.ts
- packages/core/src/collab/AwarenessState.ts
```

### Agent 8: Comments Model (Workstream D)
```
Task: Implement comments data model
Files:
- packages/core/src/collab/Comments.ts
```

### Agent 9: Offline Mode (Workstream E)
```
Task: Implement offline storage for desktop
Files:
- packages/desktop/src/main/offlineStorage.ts
```

---

## Sequential Dependencies Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    MUST BE SEQUENTIAL                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Workstream A:                                                   │
│  Cell Formatting + Number Formats → XLSX Import/Export → UI     │
│                                                                  │
│  Workstream C:                                                   │
│  Chart Model → Chart Data Provider → Individual Charts → UI     │
│                                                                  │
│  Workstream D:                                                   │
│  WebSocket Server → Room Management → CRDT/Awareness → UI       │
│                                                                  │
│  Workstream E:                                                   │
│  Main Process → Preload → Menu → File Dialogs (needs XLSX)      │
│                                                                  │
│  Cross-Workstream:                                               │
│  Desktop File Dialogs (E4) waits for XLSX (A3, A4)              │
│                                                                  │
│  Phase 9 (Polish):                                               │
│  Waits for ALL workstreams to complete                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recommended Parallel Batches

### Batch 1 ✅ COMPLETE (2024-01-31)
| Agent | Task | Workstream | Status | Tests |
|-------|------|------------|--------|-------|
| 1 | Cell Formatting + Number Formats | A | ✅ Done | 172 |
| 2 | Multi-Column Sorter | B | ✅ Done | 25+ |
| 3 | Auto-Filter | B | ✅ Done | 30+ |
| 4 | Data Validation | B | ✅ Done | 53 |
| 5 | Chart Model + Data Provider | C | ✅ Done | 105 |
| 6 | WebSocket Server + Rooms | D | ✅ Done | Working |
| 7 | Electron Main + Preload + Menu | E | ✅ Done | Setup |

### Batch 2 ✅ COMPLETE (2024-01-31)
| Agent | Task | Workstream | Status | Tests |
|-------|------|------------|--------|-------|
| 1 | XLSX Import | A | ✅ Done | 52 |
| 2 | XLSX Export | A | ✅ Done | 38 |
| 3 | Sort UI | B | ✅ Done | - |
| 4 | Filter UI | B | ✅ Done | - |
| 5 | Validation UI | B | ✅ Done | - |
| 6 | Bar/Column/Line/Pie Charts | C | ✅ Done | - |
| 7 | CRDT Yjs Binding | D | ✅ Done | 45 |
| 8 | Comments Model | D | ✅ Done | 78 |
| 9 | Offline Mode | E | ✅ Done | - |

### Batch 3 ✅ COMPLETE (2024-01-31)
| Agent | Task | Workstream | Status | Tests |
|-------|------|------------|--------|-------|
| 1 | Format Toolbar UI | A | ✅ Done | - |
| 2 | Performance Benchmarks | B | ✅ Done | - |
| 3 | Chart Editor UI | C | ✅ Done | - |
| 4 | Presence UI | D | ✅ Done | - |
| 5 | Comments UI | D | ✅ Done | - |
| 6 | Desktop File Dialogs | E | ✅ Done | - |
| 7 | Version History | D | ✅ Done | 52 |

### Batch 4 ✅ COMPLETE (2024-01-31) - MVP Complete
| Agent | Task | Phase | Status | Tests |
|-------|------|-------|--------|-------|
| 1 | Integration Testing | 9 | ✅ Done | 186 E2E |
| 2 | Performance Validation | 9 | ✅ Done | CI workflow |
| 3 | Cross-Browser Testing | 9 | ✅ Done | Multi-browser |

---

## Sub-Agent Prompts Template

Use these prompts when spawning sub-agents:

### For Core Logic Tasks:
```
Implement [FEATURE] for the MS Excel Clone project.

Context:
- Monorepo with packages: @excel/core, @excel/web, @excel/desktop, @excel/shared
- TypeScript with strict mode
- Use existing models from packages/core/src/models/

Create files:
- [LIST FILES]

Requirements:
- [LIST REQUIREMENTS]

Do NOT create UI components - only core logic.
Export from index.ts for the package.
Include unit tests in a corresponding .test.ts file.
```

### For UI Tasks:
```
Create React UI components for [FEATURE] in the MS Excel Clone project.

Context:
- React with Vite
- State management: Zustand (packages/web/src/store/)
- Existing components in packages/web/src/components/

Create files:
- [LIST FILES]

Requirements:
- [LIST REQUIREMENTS]

Use existing store patterns. Integrate with existing Toolbar/Grid components.
```

### For Server Tasks:
```
Implement [FEATURE] for the collaboration server in MS Excel Clone.

Context:
- New package: packages/server
- WebSocket-based real-time sync
- Yjs for CRDT

Create files:
- [LIST FILES]

Requirements:
- [LIST REQUIREMENTS]

Use ws package for WebSocket. Integrate with y-websocket for Yjs sync.
```

---

## Quick Reference: What Blocks What

| Blocker | Blocked Task | Reason |
|---------|--------------|--------|
| Formatting (A1, A2) | XLSX Import/Export | Need style models |
| XLSX (A3, A4) | Desktop File Dialogs (E4) | Need to read/write files |
| Chart Model (C1) | Chart Types (C3-C5) | Need data abstraction |
| WebSocket Server (D1) | All collab features | Server foundation |
| Room Management (D2) | CRDT, Presence, Comments | Session handling |
| All Workstreams | Phase 9 (Polish) | Need all features |

---

## Monitoring Parallel Progress

### Batch 1 (Complete)

| Workstream | Task | Agent ID | Status | Tests |
|------------|------|----------|--------|-------|
| A | Formatting + Number Formats | a1925c4 | ✅ Complete | 172 |
| B | Sorter | a5e6b8f | ✅ Complete | 25+ |
| B | Filter | ae03674 | ✅ Complete | 30+ |
| B | Validation | ad3812e | ✅ Complete | 53 |
| C | Chart Model + Provider | a47f994 | ✅ Complete | 105 |
| D | Server + Rooms | a54cf51 | ✅ Complete | Working |
| E | Desktop Shell | a3c4c61 | ✅ Complete | Setup |

### Batch 2 ✅ COMPLETE (2024-01-31)

| Workstream | Task | Agent ID | Status | Tests |
|------------|------|----------|--------|-------|
| A | XLSX Import | a58c154 | ✅ Complete | 52 |
| A | XLSX Export | aa9ecb2 | ✅ Complete | 38 |
| B | Sort UI | a888a78 | ✅ Complete | - |
| B | Filter UI | a5c8de9 | ✅ Complete | - |
| B | Validation UI | a1368b4 | ✅ Complete | - |
| C | Chart Components (Bar/Line/Pie) | a7b0fc9 | ✅ Complete | - |
| D | CRDT Yjs Binding | a026e41 | ✅ Complete | 45 |
| D | Comments Model | a3cfa8c | ✅ Complete | 78 |
| E | Offline Mode | a7303e3 | ✅ Complete | - |

### Batch 3 ✅ COMPLETE (2024-01-31)

| Workstream | Task | Agent ID | Status | Tests |
|------------|------|----------|--------|-------|
| A | Format Toolbar UI | af111c3 | ✅ Complete | - |
| B | Performance Benchmarks | abfd7b5 | ✅ Complete | - |
| C | Chart Editor UI | ae2cf96 | ✅ Complete | - |
| D | Presence UI | abcdddc | ✅ Complete | - |
| D | Comments UI | af5d1a0 | ✅ Complete | - |
| E | Native File Dialogs | ac186b6 | ✅ Complete | - |
| D | Version History | a1da46a | ✅ Complete | 52 |

### Files Created in Batch 3

**Workstream A (Format Toolbar):**
- `packages/web/src/components/FormatToolbar/FormatToolbar.tsx`
- `packages/web/src/components/FormatToolbar/FontPicker.tsx`
- `packages/web/src/components/FormatToolbar/ColorPicker.tsx`
- `packages/web/src/components/FormatToolbar/BorderPicker.tsx`
- `packages/web/src/components/FormatToolbar/NumberFormatPicker.tsx`
- `packages/web/src/hooks/useFormatting.ts`

**Workstream B (Performance):**
- `packages/core/tests/perf/utils.ts`
- `packages/core/tests/perf/scroll.perf.ts`
- `packages/core/tests/perf/calculation.perf.ts`
- `packages/core/tests/perf/memory.perf.ts`
- `packages/core/tests/perf/data-tools.perf.ts`
- `packages/core/vitest.perf.config.ts`

**Workstream C (Chart Editor):**
- `packages/web/src/components/ChartEditor/ChartEditorDialog.tsx`
- `packages/web/src/components/ChartEditor/ChartTypeSelector.tsx`
- `packages/web/src/components/ChartEditor/DataRangePicker.tsx`
- `packages/web/src/components/ChartEditor/ChartStyleEditor.tsx`
- `packages/web/src/components/ChartEditor/AxisEditor.tsx`
- `packages/web/src/components/ChartEditor/LegendEditor.tsx`
- `packages/web/src/hooks/useChartEditor.ts`

**Workstream D (Collaboration UI):**
- `packages/web/src/components/Presence/UserCursor.tsx`
- `packages/web/src/components/Presence/UserSelection.tsx`
- `packages/web/src/components/Presence/UserList.tsx`
- `packages/web/src/components/Presence/UserAvatar.tsx`
- `packages/web/src/components/Presence/PresenceOverlay.tsx`
- `packages/web/src/components/Comments/CommentThread.tsx`
- `packages/web/src/components/Comments/CommentInput.tsx`
- `packages/web/src/components/Comments/CommentIndicator.tsx`
- `packages/web/src/components/Comments/CommentPopover.tsx`
- `packages/web/src/components/Comments/CommentsSidebar.tsx`
- `packages/web/src/components/Comments/MentionInput.tsx`
- `packages/web/src/components/VersionHistory/VersionList.tsx`
- `packages/web/src/components/VersionHistory/VersionPreview.tsx`
- `packages/web/src/components/VersionHistory/VersionDiff.tsx`
- `packages/web/src/hooks/usePresence.ts`
- `packages/web/src/hooks/useComments.ts`
- `packages/web/src/hooks/useVersionHistory.ts`
- `packages/core/src/collab/VersionHistory.ts`
- `packages/server/src/versions/VersionStore.ts`

**Workstream E (Desktop):**
- `packages/desktop/src/main/fileDialogs.ts`
- `packages/desktop/src/main/fileOperations.ts`
- `packages/desktop/src/main/documentState.ts`
- `packages/desktop/src/preload/fileApi.ts`

### Batch 4 ✅ COMPLETE (2024-01-31)

| Phase | Task | Agent ID | Status | Tests |
|-------|------|----------|--------|-------|
| 9 | Integration Testing | a4d8f70 | ✅ Complete | 186 E2E |
| 9 | Performance Validation | a179d87 | ✅ Complete | CI workflow |
| 9 | Cross-Browser Testing | a051e35 | ✅ Complete | Multi-browser |

### Files Created in Batch 4

**Integration Testing:**
- `packages/web/tests/e2e/grid.spec.ts` - 33 grid tests
- `packages/web/tests/e2e/formulas.spec.ts` - 40 formula tests
- `packages/web/tests/e2e/formatting.spec.ts` - 32 formatting tests
- `packages/web/tests/e2e/data-tools.spec.ts` - 24 data tools tests
- `packages/web/tests/e2e/charts.spec.ts` - 21 chart tests
- `packages/web/tests/e2e/file-io.spec.ts` - 18 file I/O tests
- `packages/web/tests/e2e/collaboration.spec.ts` - 18 collaboration tests
- `packages/web/tests/e2e/fixtures/test-data.ts`
- `packages/web/playwright.config.ts`

**Performance Validation:**
- `packages/core/scripts/validate-performance.ts`
- `packages/core/scripts/generate-perf-report.ts`
- `packages/core/tests/perf/regression-baseline.json`
- `packages/web/tests/perf/render-benchmark.ts`
- `packages/web/tests/perf/interaction-benchmark.ts`
- `.github/workflows/performance.yml`

**Cross-Browser Testing:**
- `packages/web/tests/compat/keyboard.spec.ts`
- `packages/web/tests/compat/clipboard.spec.ts`
- `packages/web/tests/compat/selection.spec.ts`
- `packages/web/tests/compat/rendering.spec.ts`
- `packages/web/tests/compat/storage.spec.ts`
- `packages/web/tests/compat/browser-support.ts`
- `packages/web/playwright.compat.config.ts`

---

## Estimated Parallel Timeline

With full parallelization:

| Week | Batch 1 | Batch 2 | Batch 3 | Batch 4 |
|------|---------|---------|---------|---------|
| 1-2 | ✅ COMPLETE | - | - | - |
| 3-4 | - | XLSX, Charts, CRDT, UI | - | - |
| 5-6 | - | - | Final UI, Features | - |
| 7-8 | - | - | - | Polish & QA |

**Without parallelization:** ~20 weeks
**With full parallelization:** ~8 weeks (60% reduction)

---

## Progress Summary

| Metric | Value |
|--------|-------|
| Batch 1 Completed | 2024-01-31 |
| Batch 2 Completed | 2024-01-31 |
| Batch 3 Completed | 2024-01-31 |
| Batch 4 Completed | 2024-01-31 |
| Total Tests Written | 836+ |
| Files Created | 120+ |
| Workstreams Complete | 5/5 |
| Phases Complete | 10/10 (0-9) |
| **MVP Status** | **✅ COMPLETE** |

---

## MVP Completion Summary

### Total Implementation Stats

| Category | Count |
|----------|-------|
| Sub-agents spawned | 26 |
| Unit tests | 650+ |
| E2E tests | 186 |
| Total tests | 836+ |
| Core files created | 50+ |
| Web components created | 40+ |
| Desktop files created | 15+ |
| Server files created | 10+ |

### Features Delivered

**Core Engine:**
- Virtualized grid (100k+ rows)
- Formula engine with 50+ functions
- Dependency tracking & incremental recalc
- Undo/redo with command pattern

**Formatting & Files:**
- Full cell styling (fonts, colors, borders)
- Number formatting (Excel-compatible)
- XLSX import/export with ExcelJS
- CSV import/export

**Data Tools:**
- Multi-column sorting
- Auto-filter with 18 operators
- Data validation (8 types)
- Performance benchmarks

**Charts:**
- Bar, Line, Pie charts with ECharts
- Chart editor with type/data/style config
- Live updates from data changes

**Collaboration:**
- WebSocket server with Yjs CRDT
- Real-time presence & cursors
- Comments with @mentions
- Version history with diff

**Desktop:**
- Electron app with native menus
- File dialogs with XLSX integration
- Offline storage & auto-save
- Recent files tracking

**Testing:**
- 186 E2E tests with Playwright
- Performance validation CI
- Cross-browser compatibility tests
