# Phase 3: Calculation Core

**Status:** ✅ Complete
**Sprint:** 3
**Goal:** Build the dependency graph and formula evaluator

---

## Tasks

### 1. Dependency Graph (Large)
- [x] Track cell-to-cell dependencies from formulas
- [x] Efficient update on cell reference changes
- [x] Handle cross-sheet references (Sheet1!A1)

### 2. Formula Evaluator (Large)
- [x] Walk AST and compute values
- [x] Type coercion (string to number, etc.)
- [x] Error propagation (#VALUE!, #REF!, etc.)
- [x] Circular reference detection

### 3. Core Function Library (Medium)
- [x] Math: SUM, AVERAGE, MIN, MAX, ABS, ROUND, SQRT, POWER
- [x] Logical: IF, AND, OR, NOT, TRUE, FALSE, IFERROR
- [x] Stats: COUNT, COUNTA, COUNTIF, COUNTBLANK, SUMIF
- [x] Text: LEN, LEFT, RIGHT, MID, CONCATENATE, UPPER, LOWER, TRIM, TEXT

### 4. Incremental Recalculation (Medium)
- [x] Dirty cell tracking (via dependency graph)
- [x] Topological sort for calculation order
- [ ] Batch recalculation for performance - *Partial*

---

## Key Files Created

```
packages/core/src/formula/
├── DependencyGraph.ts              # Cell dependency tracking
├── Evaluator.ts                    # AST evaluation
└── functions/
    ├── index.ts                    # Function registry
    ├── types.ts                    # FormulaFunction interface
    ├── math.ts                     # SUM, AVERAGE, MIN, MAX, etc.
    ├── logical.ts                  # IF, AND, OR, NOT, etc.
    ├── text.ts                     # LEN, LEFT, RIGHT, MID, etc.
    └── stats.ts                    # COUNT, COUNTA, COUNTIF, etc.
```

---

## Technical Implementation

### Dependency Graph
```typescript
class DependencyGraph {
  // For each cell, track what it depends on and what depends on it
  private dependencies: Map<string, {
    dependsOn: Set<string>;
    dependents: Set<string>;
  }>;

  updateDependencies(address: CellAddress, ast: ASTNode | null): void;
  getDependents(address: CellAddress): CellAddress[];
  getRecalculationOrder(changedCells: CellAddress[]): CellAddress[];
  hasCircularReference(address: CellAddress): boolean;
}
```

### Evaluation Context
```typescript
interface EvaluationContext {
  workbook: Workbook;
  currentSheet: Sheet;
  currentCell: CellAddress;
  evaluatingCells: Set<string>;  // For circular ref detection
  functions?: Map<string, FormulaFunction>;
}
```

### Function Interface
```typescript
interface FormulaFunction {
  name: string;
  minArgs: number;
  maxArgs: number;  // -1 for unlimited
  description: string;
  execute(args: FunctionArg[], evaluator: Evaluator): CellValue;
}

type FunctionArg = CellValue | CellValue[];  // Single value or range
```

### Error Codes
```typescript
enum CellErrorCode {
  DIV_ZERO = '#DIV/0!',
  NAME = '#NAME?',
  NA = '#N/A',
  NULL = '#NULL!',
  NUM = '#NUM!',
  REF = '#REF!',
  VALUE = '#VALUE!',
  CIRCULAR = '#CIRCULAR!',
  GETTING_DATA = '#GETTING_DATA',
  SPILL = '#SPILL!',
  CALC = '#CALC!',
}
```

### Type Coercion Rules
| From | To Number | To String | To Boolean |
|------|-----------|-----------|------------|
| Empty | 0 | "" | FALSE |
| Number | value | toString() | value !== 0 |
| String | parseFloat or #VALUE! | value | "TRUE"/"FALSE" or #VALUE! |
| Boolean | TRUE=1, FALSE=0 | "TRUE"/"FALSE" | value |
| Error | propagate | code | propagate |

---

## Implemented Functions

### Math Functions
| Function | Args | Description |
|----------|------|-------------|
| SUM | 1+ | Sum of all numbers |
| AVERAGE | 1+ | Average of numbers |
| MIN | 1+ | Minimum value |
| MAX | 1+ | Maximum value |
| ABS | 1 | Absolute value |
| ROUND | 1-2 | Round to digits |
| SQRT | 1 | Square root |
| POWER | 2 | Base^exponent |

### Logical Functions
| Function | Args | Description |
|----------|------|-------------|
| IF | 2-3 | Conditional |
| AND | 1+ | All TRUE |
| OR | 1+ | Any TRUE |
| NOT | 1 | Negate |
| TRUE | 0 | Returns TRUE |
| FALSE | 0 | Returns FALSE |
| IFERROR | 2 | Handle errors |

### Text Functions
| Function | Args | Description |
|----------|------|-------------|
| LEN | 1 | String length |
| LEFT | 1-2 | Left characters |
| RIGHT | 1-2 | Right characters |
| MID | 3 | Middle characters |
| CONCATENATE | 1+ | Join strings |
| UPPER | 1 | Uppercase |
| LOWER | 1 | Lowercase |
| TRIM | 1 | Remove spaces |
| TEXT | 2 | Format number |

### Statistical Functions
| Function | Args | Description |
|----------|------|-------------|
| COUNT | 1+ | Count numbers |
| COUNTA | 1+ | Count non-empty |
| COUNTBLANK | 1 | Count empty |
| COUNTIF | 2 | Conditional count |
| SUMIF | 2-3 | Conditional sum |

---

## Verification

- [x] Calculate sheet with 10k formulas
- [x] Verify circular ref detection
- [x] Test all functions
- [x] Test error propagation
- [x] Test cross-sheet references
