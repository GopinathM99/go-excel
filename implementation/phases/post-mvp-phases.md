# Post-MVP Phases (10-19)

**Status:** 🔲 Future
**Sprints:** 10-30
**Goal:** Advanced features beyond MVP

---

## Phase 10: Formula Depth (Sprints 10-12)

### Features
- Financial functions (PMT, NPV, IRR, FV, PV, RATE, NPER)
- Statistical functions (STDEV, MEDIAN, PERCENTILE, QUARTILE, MODE)
- Dynamic arrays (FILTER, SORT, UNIQUE, SEQUENCE, RANDARRAY)
- LET and LAMBDA functions
- 3D references (Sheet1:Sheet3!A1)
- External links to other workbooks

### Key Functions to Implement
```
Financial: PMT, NPV, IRR, FV, PV, RATE, NPER, IPMT, PPMT
Statistical: STDEV, STDEVP, VAR, VARP, MEDIAN, MODE, PERCENTILE
Lookup: VLOOKUP, HLOOKUP, INDEX, MATCH, XLOOKUP, XMATCH
Date/Time: DATE, TIME, NOW, TODAY, YEAR, MONTH, DAY, HOUR, MINUTE
Math: SUMPRODUCT, SUMIFS, AVERAGEIF, AVERAGEIFS
Array: FILTER, SORT, SORTBY, UNIQUE, SEQUENCE, RANDARRAY
Lambda: LET, LAMBDA, MAP, REDUCE, SCAN, MAKEARRAY
```

---

## Phase 11: Advanced Formatting (Sprints 13-14)

### Features
- Conditional formatting
  - Rules (greater than, less than, between, text contains)
  - Color scales (2-color, 3-color)
  - Data bars
  - Icon sets
- Custom number formats (full syntax)
- Rich text in cells (mixed formatting)
- Hyperlinks
- Theme support (colors, fonts)

### Conditional Format Types
```typescript
type ConditionalFormatType =
  | 'cellValue'      // Compare cell value
  | 'formula'        // Custom formula
  | 'colorScale'     // Gradient colors
  | 'dataBar'        // In-cell bar chart
  | 'iconSet'        // Icons based on value
  | 'top10'          // Top/bottom N
  | 'aboveAverage'   // Above/below average
  | 'duplicates'     // Duplicate values
  | 'unique'         // Unique values
  | 'blanks'         // Blank cells
  | 'errors';        // Error cells
```

---

## Phase 12: Pivot Tables (Sprints 15-17)

### Features
- Pivot cache and aggregation engine
- Drag-and-drop pivot builder UI
- Common aggregations (SUM, COUNT, AVERAGE, MIN, MAX)
- Row and column grouping
- Calculated fields
- Pivot charts

### Pivot Table Model
```typescript
interface PivotTable {
  id: string;
  name: string;
  sourceRange: CellRange;
  location: CellAddress;

  rowFields: PivotField[];
  columnFields: PivotField[];
  valueFields: PivotValueField[];
  filterFields: PivotField[];

  cache: PivotCache;
}

interface PivotField {
  sourceColumn: number;
  name: string;
  sortOrder: 'ascending' | 'descending' | 'manual';
  items: string[];
  hiddenItems: Set<string>;
}

interface PivotValueField {
  sourceColumn: number;
  name: string;
  aggregation: 'sum' | 'count' | 'average' | 'min' | 'max' | 'product';
  numberFormat?: string;
}
```

---

## Phase 13: Advanced Charts (Sprints 18-19)

### Features
- Extended chart types
  - Scatter (XY) charts
  - Combo charts
  - Area charts
  - Doughnut charts
  - Radar charts
  - Stock charts
- Trendlines and error bars
- Secondary axes
- Dynamic chart titles (linked to cells)
- Sparklines (in-cell mini-charts)

---

## Phase 14: Advanced Data Tools (Sprints 20-21)

### Features
- Power Query lite
  - Connect to data sources
  - Transform steps
  - Refresh data
- Data cleanup utilities
  - Remove duplicates
  - Text to columns
  - Flash fill
- Goal Seek and Solver
- Grouping and subtotals
- Data consolidation

---

## Phase 15: Automation (Sprints 22-24)

### Features
- Custom functions (UDFs) in JavaScript
- Macro engine (recording and playback)
- Add-in/plugin API
- Office Scripts compatibility
- Event hooks (onEdit, onOpen, etc.)

### UDF Example
```typescript
// User-defined function
registerFunction({
  name: 'MYFUNCTION',
  description: 'Custom function',
  params: [
    { name: 'value', type: 'number' },
    { name: 'multiplier', type: 'number', optional: true },
  ],
  execute: (value: number, multiplier = 1) => {
    return value * multiplier;
  },
});
```

---

## Phase 16: Advanced Collaboration (Sprint 25)

### Features
- Range-level permissions
  - View-only ranges
  - Edit-protected ranges
  - User/group permissions
- Change tracking
  - Track all changes
  - Accept/reject changes
  - Change history by user
- Offline edit merging
  - Conflict detection
  - Manual merge UI

---

## Phase 17: XLSX Parity (Sprints 26-27)

### Features
- Advanced styles and metadata
- Pivot table export
- Chart export
- Conditional format export
- Templates
- Legacy format support (.xls)
- ODS support

---

## Phase 18: Performance Optimization (Sprint 28)

### Features
- Multi-threaded calculation (Web Workers)
- Memory-optimized storage
- 5M+ cell support
- Lazy loading for large files
- Calculation caching

### Web Worker Architecture
```typescript
// Main thread
const calcWorker = new Worker('calc-worker.js');
calcWorker.postMessage({ type: 'recalculate', cells: dirtyCells });
calcWorker.onmessage = (e) => {
  updateCellValues(e.data.results);
};

// Worker thread
self.onmessage = (e) => {
  const results = calculate(e.data.cells);
  self.postMessage({ results });
};
```

---

## Phase 19: Platform Polish (Sprints 29-30)

### Features
- Native OS integrations
  - macOS: Touch Bar, Share menu
  - Windows: Jump lists, taskbar progress
  - Linux: Desktop integration
- PWA support
  - Installable
  - Offline capable
  - Push notifications
- Accessibility (a11y)
  - Screen reader support
  - Keyboard navigation
  - High contrast mode
- Localization (i18n)
  - UI translation
  - Number/date formats
  - Formula names (localized)
- RTL support
  - Right-to-left text
  - Mirrored UI

---

## Timeline Summary

| Phase | Sprints | Duration |
|-------|---------|----------|
| 10: Formula Depth | 10-12 | 6 weeks |
| 11: Advanced Formatting | 13-14 | 4 weeks |
| 12: Pivot Tables | 15-17 | 6 weeks |
| 13: Advanced Charts | 18-19 | 4 weeks |
| 14: Advanced Data Tools | 20-21 | 4 weeks |
| 15: Automation | 22-24 | 6 weeks |
| 16: Advanced Collaboration | 25 | 2 weeks |
| 17: XLSX Parity | 26-27 | 4 weeks |
| 18: Performance | 28 | 2 weeks |
| 19: Platform Polish | 29-30 | 4 weeks |
| **Total** | **21 sprints** | **~42 weeks** |
