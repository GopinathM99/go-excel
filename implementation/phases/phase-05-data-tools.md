# Phase 5: Data Tools & Performance

**Status:** ✅ Complete
**Sprint:** 5
**Goal:** Sorting, filtering, data validation
**Last Updated:** 2024-01-31

---

## Tasks

### 1. Multi-Column Sort (Medium) ✅ COMPLETE
- [x] Sort by multiple columns with priority
- [x] Ascending/descending per column
- [x] Stable sort for equal values
- [x] Sort within selection or auto-detect range
- [x] Natural sort for text (A2 before A10)
- [x] Handle mixed types (numbers < text < blanks < errors)
- [x] Undo support via row mappings

**Files Created:**
- `packages/core/src/data/Sorter.ts`

**Tests:** 25+ passing tests

### 2. Basic Filtering (Medium) ✅ COMPLETE
- [x] Auto-filter dropdowns in headers
- [x] Filter by value, text contains, number ranges
- [x] Multiple filter criteria (AND/OR logic)
- [x] Clear filter functionality
- [x] 18 filter operators (equals, contains, between, top10, aboveAverage, etc.)
- [x] Get unique values for filter dropdowns

**Files Created:**
- `packages/core/src/data/Filter.ts`

**Tests:** 30+ passing tests

### 3. Data Validation (Small) ✅ COMPLETE
- [x] Dropdown lists (from values, cell range, or formula)
- [x] Number ranges (min/max)
- [x] Date ranges
- [x] Custom error messages
- [x] 8 validation types (any, whole, decimal, list, date, time, textLength, custom)
- [x] Input messages and error dialogs
- [x] Serialization/deserialization

**Files Created:**
- `packages/core/src/data/Validation.ts`
- `packages/core/src/data/index.ts`

**Tests:** 53 passing tests

### 4. Performance Benchmarks (Small) ✅ COMPLETE
- [x] Establish baseline metrics
- [x] Automated performance tests
- [x] Memory profiling
- [x] Regression detection

**Files Created:**
- `packages/core/tests/perf/utils.ts`
- `packages/core/tests/perf/scroll.perf.ts`
- `packages/core/tests/perf/calculation.perf.ts`
- `packages/core/tests/perf/memory.perf.ts`
- `packages/core/tests/perf/data-tools.perf.ts`
- `packages/core/vitest.perf.config.ts`

### 5. UI Components ✅ COMPLETE
- [x] Sort Dialog - Multi-level sort with keyboard accessibility
- [x] Filter Dropdown/Menu - 18 operators, value/condition filters
- [x] Validation Dialog/Dropdown - All 8 types, error popups

**Files Created:**
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

## Key Files to Create

```
packages/core/src/
├── data/
│   ├── index.ts
│   ├── Sorter.ts                   # Multi-column sorting
│   ├── Filter.ts                   # Auto-filter implementation
│   └── Validation.ts               # Data validation rules
└── tests/
    └── perf/
        ├── scroll.perf.ts          # Scroll performance
        ├── calculation.perf.ts     # Formula calculation
        └── memory.perf.ts          # Memory usage

packages/web/src/
├── components/
│   ├── Filter/
│   │   ├── index.tsx
│   │   ├── FilterDropdown.tsx
│   │   ├── FilterMenu.tsx
│   │   └── FilterCondition.tsx
│   ├── Sort/
│   │   ├── index.tsx
│   │   └── SortDialog.tsx
│   └── Validation/
│       ├── index.tsx
│       ├── ValidationDialog.tsx
│       └── ValidationDropdown.tsx
```

---

## Technical Implementation

### Sort Algorithm
```typescript
interface SortCriteria {
  column: number;
  ascending: boolean;
  // For stable sort, maintain original order for equal values
}

function sortRange(
  sheet: Sheet,
  range: CellRange,
  criteria: SortCriteria[]
): Sheet {
  // 1. Extract rows from range
  // 2. Sort using multi-key comparison
  // 3. Update sheet with sorted rows
  // 4. Preserve formulas (update references)
}
```

### Filter Model
```typescript
interface AutoFilter {
  range: CellRange;
  filters: Map<number, ColumnFilter>;
}

interface ColumnFilter {
  type: 'values' | 'condition';
  // For value filter
  values?: Set<string>;
  // For condition filter
  conditions?: FilterCondition[];
}

interface FilterCondition {
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' |
            'greaterThan' | 'lessThan' | 'between' | 'top10' | 'aboveAverage';
  value1?: string | number;
  value2?: string | number;  // For 'between'
}
```

### Data Validation Model
```typescript
interface DataValidation {
  type: 'any' | 'whole' | 'decimal' | 'list' | 'date' | 'time' | 'textLength' | 'custom';
  operator?: 'between' | 'notBetween' | 'equal' | 'notEqual' |
             'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual';
  formula1?: string;
  formula2?: string;
  values?: string[];  // For list type
  showDropdown?: boolean;
  allowBlank?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  showError?: boolean;
  promptTitle?: string;
  promptMessage?: string;
  showPrompt?: boolean;
}
```

### Performance Targets
| Metric | Target |
|--------|--------|
| Scroll FPS | 60fps |
| Open 1M cells | < 3s |
| Recalc 100k formulas | < 1s |
| Sort 100k rows | < 2s |
| Filter 100k rows | < 500ms |
| Memory (1M cells) | < 500MB |

---

## Verification

- [ ] Sort 100k rows
- [ ] Filter with complex criteria
- [ ] Validate against benchmarks
- [ ] No memory leaks after repeated operations
- [ ] Data validation prevents invalid input
