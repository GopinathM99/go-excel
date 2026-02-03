# Phase 2: Core Behaviors

**Status:** ✅ Complete
**Sprint:** 2
**Goal:** Implement undo/redo and formula parsing foundation

---

## Tasks

### 1. Undo/Redo Engine (Medium)
- [x] Command pattern for all operations
- [x] Operation grouping (e.g., paste affects multiple cells)
- [x] Undo stack with configurable depth
- [x] Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

### 2. Formula Parser (Large)
- [x] Tokenizer for Excel formula syntax
- [x] AST builder with operator precedence
- [x] Support: cell refs, ranges, functions, operators
- [x] Error token handling

### 3. CSV Import/Export (Medium)
- [x] Parse CSV with configurable delimiter
- [x] Handle quoted strings, escaped quotes
- [x] Export with proper escaping
- [x] Locale-aware number/date parsing

---

## Key Files Created

```
packages/core/src/
├── commands/
│   ├── index.ts
│   ├── Command.ts                  # Base Command interface, SheetCommand, CommandGroup
│   └── CellCommands.ts             # SetCellValue, ClearRange, SetCellStyle, PasteCells
├── history/
│   ├── index.ts
│   └── UndoManager.ts              # Undo/redo stack management
├── formula/
│   ├── index.ts
│   ├── Token.ts                    # Token types, precedence
│   ├── Lexer.ts                    # Tokenizer
│   ├── AST.ts                      # AST node types
│   └── Parser.ts                   # Formula parser
└── io/
    ├── index.ts
    └── CsvHandler.ts               # CSV import/export
```

---

## Technical Implementation

### Command Pattern
```typescript
interface Command {
  readonly id: string;
  readonly description: string;
  execute(workbook: Workbook): Workbook;
  undo(workbook: Workbook): Workbook;
  canMergeWith?(other: Command): boolean;
  mergeWith?(other: Command): Command;
}
```

### UndoManager Features
- Configurable stack depth (default: 100)
- Command merging for rapid edits (500ms window)
- Batch operations via `beginBatch()`
- Event subscriptions for UI updates

### Token Types
```typescript
enum TokenType {
  // Literals
  NUMBER, STRING, BOOLEAN, ERROR,
  // References
  CELL_REF, RANGE_REF, NAMED_RANGE, SHEET_REF,
  // Operators
  PLUS, MINUS, MULTIPLY, DIVIDE, POWER, PERCENT, CONCAT,
  // Comparison
  EQUALS, NOT_EQUALS, LESS_THAN, LESS_EQUAL, GREATER_THAN, GREATER_EQUAL,
  // Delimiters
  LPAREN, RPAREN, COMMA, COLON, SEMICOLON, LBRACE, RBRACE,
  // Special
  FUNCTION, WHITESPACE, EOF, INVALID
}
```

### Operator Precedence (high = binds tighter)
| Level | Operators |
|-------|-----------|
| 7 | % (postfix) |
| 6 | ^ |
| 5 | * / |
| 4 | + - |
| 3 | = <> < <= > >= |
| 2 | & |
| 1 | : (range) |

### CSV Options
```typescript
interface CsvParseOptions {
  delimiter?: string;      // default: ','
  lineSeparator?: string;  // auto-detect
  quoteChar?: string;      // default: '"'
  hasHeaders?: boolean;
  trimValues?: boolean;
  parseValues?: boolean;
  locale?: string;
}
```

---

## Verification

- [x] Test undo/redo with 50+ operations
- [x] Parse complex formulas: `SUM(A1:B10, 100) + IF(C1>0, "yes", "no")`
- [x] Round-trip CSV files
- [x] Handle edge cases (escaped quotes, empty fields)

---

## Test Files Created

```
packages/core/src/
├── models/__tests__/
│   └── CellAddress.test.ts
└── formula/__tests__/
    ├── Lexer.test.ts
    └── Parser.test.ts
```
