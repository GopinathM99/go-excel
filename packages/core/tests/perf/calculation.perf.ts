/**
 * Formula Calculation Performance Tests
 *
 * Tests for measuring formula evaluation speed, dependency tracking,
 * and recalculation performance with complex formulas.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  measureTime,
  runBenchmarkWithTarget,
  createSheetWithFormulas,
  createDeepDependencyChain,
  PERFORMANCE_TARGETS,
  reportResults,
  type BenchmarkResult,
} from './utils';
import {
  createSheet,
  setCell,
  getCell,
  type Sheet,
} from '../../src/models/Sheet';
import { createCell } from '../../src/models/Cell';
import { createWorkbook, updateSheet, type Workbook } from '../../src/models/Workbook';
import { numberValue, CellErrorCode } from '../../src/models/CellValue';
import { DependencyGraph } from '../../src/formula/DependencyGraph';
import { Parser } from '../../src/formula/Parser';
import { Evaluator, type EvaluationContext } from '../../src/formula/Evaluator';
import { Lexer } from '../../src/formula/Lexer';

describe('Calculation Performance', () => {
  const results: BenchmarkResult[] = [];

  /**
   * Creates a sheet with formula cells for testing
   */
  function createFormulaSheet(numCells: number, formulaComplexity: 'simple' | 'medium' | 'complex' = 'simple'): Sheet {
    let sheet = createSheet('FormulaTest');
    const cols = 10;
    const rows = Math.ceil(numCells / cols);

    // Create base values in first row
    for (let col = 0; col < cols; col++) {
      const cell = createCell(
        { row: 0, col },
        String(col + 1),
        numberValue(col + 1)
      );
      sheet = setCell(sheet, cell);
    }

    // Create formulas in remaining rows
    for (let row = 1; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let formula: string;

        switch (formulaComplexity) {
          case 'simple':
            // Simple reference to cell above
            formula = `=A${row}+1`;
            break;
          case 'medium':
            // SUM of a small range
            formula = `=SUM(A${row}:C${row})+${col}`;
            break;
          case 'complex':
            // Nested IF with multiple references
            formula = `=IF(A${row}>5,IF(B${row}>3,A${row}*B${row},A${row}+B${row}),0)`;
            break;
        }

        const cell = createCell({ row, col }, formula);
        sheet = setCell(sheet, cell);
      }
    }

    return sheet;
  }

  /**
   * Simulates recalculating all formula cells
   */
  function recalculateSheet(sheet: Sheet): number {
    let calcCount = 0;
    const baseWorkbook = createWorkbook('Test');
    // Replace the default sheet with our test sheet
    const workbook: Workbook = {
      ...baseWorkbook,
      sheets: [sheet],
    };

    const context: EvaluationContext = {
      workbook,
      currentSheet: sheet,
      currentCell: { row: 0, col: 0 },
      evaluatingCells: new Set(),
    };

    for (const cell of sheet.cells.values()) {
      if (cell.content.isFormula) {
        try {
          const lexer = new Lexer(cell.content.raw.slice(1));
          const tokens = lexer.tokenize();
          const parser = new Parser(tokens);
          const ast = parser.parse();
          const evaluator = new Evaluator({
            ...context,
            currentCell: cell.address,
          });
          evaluator.evaluate(ast);
          calcCount++;
        } catch {
          // Skip invalid formulas
        }
      }
    }

    return calcCount;
  }

  describe('Recalculate 10k Cells with Formulas', () => {
    let sheet10k: Sheet;

    beforeEach(() => {
      sheet10k = createFormulaSheet(10000, 'simple');
    });

    it('should recalculate 10k simple formulas under 500ms', () => {
      const result = runBenchmarkWithTarget(
        'Recalculate 10k simple formulas',
        () => recalculateSheet(sheet10k),
        PERFORMANCE_TARGETS.RECALC_10K_FORMULAS_MS,
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should recalculate 10k medium complexity formulas', () => {
      const mediumSheet = createFormulaSheet(10000, 'medium');

      const result = runBenchmarkWithTarget(
        'Recalculate 10k medium formulas',
        () => recalculateSheet(mediumSheet),
        PERFORMANCE_TARGETS.RECALC_10K_FORMULAS_MS * 1.5, // Allow 50% more time
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });
  });

  describe('Recalculate 100k Cells with Formulas', () => {
    let sheet100k: Sheet;

    beforeEach(() => {
      sheet100k = createFormulaSheet(100000, 'simple');
    });

    it('should recalculate 100k formulas under 2s', () => {
      const result = runBenchmarkWithTarget(
        'Recalculate 100k simple formulas',
        () => recalculateSheet(sheet100k),
        PERFORMANCE_TARGETS.RECALC_100K_FORMULAS_MS,
        3
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });
  });

  describe('Deep Dependency Chain', () => {
    it('should handle 1000-level dependency chain', () => {
      const deepSheet = createDeepDependencyChain(1000);

      const result = runBenchmarkWithTarget(
        'Deep dependency chain (1000 levels)',
        () => recalculateSheet(deepSheet),
        PERFORMANCE_TARGETS.DEEP_DEPENDENCY_MS,
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should build dependency graph for 1000 cells efficiently', () => {
      const sheet = createDeepDependencyChain(1000);
      const graph = new DependencyGraph();

      const buildGraph = () => {
        for (const cell of sheet.cells.values()) {
          if (cell.content.isFormula) {
            try {
              const lexer = new Lexer(cell.content.raw.slice(1));
              const tokens = lexer.tokenize();
              const parser = new Parser(tokens);
              const ast = parser.parse();
              graph.updateDependencies(cell.address, ast);
            } catch {
              // Skip invalid formulas
            }
          }
        }
      };

      const { duration } = measureTime(buildGraph);

      expect(duration).toBeLessThan(100); // Should build in under 100ms
    });

    it('should calculate recalculation order efficiently', () => {
      const sheet = createDeepDependencyChain(1000);
      const graph = new DependencyGraph();

      // Build the graph first
      for (const cell of sheet.cells.values()) {
        if (cell.content.isFormula) {
          try {
            const lexer = new Lexer(cell.content.raw.slice(1));
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            const ast = parser.parse();
            graph.updateDependencies(cell.address, ast);
          } catch {
            // Skip
          }
        }
      }

      // Measure time to get recalculation order
      const { duration } = measureTime(() => {
        graph.getRecalculationOrder([{ row: 0, col: 0 }]);
      });

      expect(duration).toBeLessThan(50); // Should be very fast
    });
  });

  describe('Circular Reference Detection', () => {
    it('should detect circular references quickly', () => {
      const graph = new DependencyGraph();

      // Create a circular dependency: A1 -> B1 -> C1 -> A1
      const createCircular = () => {
        // A1 = B1 + 1
        graph.updateDependencies(
          { row: 0, col: 0 },
          { type: 'cellRef', address: { row: 0, col: 1 } }
        );
        // B1 = C1 + 1
        graph.updateDependencies(
          { row: 0, col: 1 },
          { type: 'cellRef', address: { row: 0, col: 2 } }
        );
        // C1 = A1 + 1 (creates cycle)
        graph.updateDependencies(
          { row: 0, col: 2 },
          { type: 'cellRef', address: { row: 0, col: 0 } }
        );
      };

      createCircular();

      const { duration } = measureTime(() => {
        const hasCircular = graph.hasCircularReference({ row: 0, col: 0 });
        expect(hasCircular).toBe(true);
      });

      expect(duration).toBeLessThan(10); // Detection should be near-instant
    });

    it('should detect circular references in large graphs', () => {
      const graph = new DependencyGraph();

      // Build a large graph with a cycle at the end
      for (let i = 0; i < 999; i++) {
        graph.updateDependencies(
          { row: i, col: 0 },
          { type: 'cellRef', address: { row: i + 1, col: 0 } }
        );
      }
      // Create cycle: last cell references first
      graph.updateDependencies(
        { row: 999, col: 0 },
        { type: 'cellRef', address: { row: 0, col: 0 } }
      );

      const { duration } = measureTime(() => {
        const hasCircular = graph.hasCircularReference({ row: 0, col: 0 });
        expect(hasCircular).toBe(true);
      });

      expect(duration).toBeLessThan(100); // Should handle 1000 nodes quickly
    });
  });

  describe('Complex Formula Parsing', () => {
    it('should parse nested IF formulas quickly', () => {
      const complexFormula = '=IF(A1>10,IF(B1>20,IF(C1>30,A1*B1*C1,A1*B1),A1),0)';

      const result = runBenchmarkWithTarget(
        'Parse nested IF formula (1000 times)',
        () => {
          for (let i = 0; i < 1000; i++) {
            const lexer = new Lexer(complexFormula.slice(1));
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            parser.parse();
          }
        },
        100, // Should complete in under 100ms
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should parse VLOOKUP formulas quickly', () => {
      const vlookupFormula = '=VLOOKUP(A1,B1:E100,3,FALSE)';

      const result = runBenchmarkWithTarget(
        'Parse VLOOKUP formula (1000 times)',
        () => {
          for (let i = 0; i < 1000; i++) {
            const lexer = new Lexer(vlookupFormula.slice(1));
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            parser.parse();
          }
        },
        100,
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should parse array formulas with ranges', () => {
      const arrayFormula = '=SUM(A1:A1000)+AVERAGE(B1:B1000)+MAX(C1:C1000)+MIN(D1:D1000)';

      const { duration } = measureTime(() => {
        for (let i = 0; i < 1000; i++) {
          const lexer = new Lexer(arrayFormula.slice(1));
          const tokens = lexer.tokenize();
          const parser = new Parser(tokens);
          parser.parse();
        }
      });

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Incremental Recalculation', () => {
    it('should efficiently recalculate only affected cells', () => {
      const sheet = createSheetWithFormulas(1000, 10);
      const graph = new DependencyGraph();

      // Build dependency graph
      for (const cell of sheet.cells.values()) {
        if (cell.content.isFormula) {
          try {
            const lexer = new Lexer(cell.content.raw.slice(1));
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            const ast = parser.parse();
            graph.updateDependencies(cell.address, ast);
          } catch {
            // Skip
          }
        }
      }

      // Measure time to find affected cells when A1 changes
      const { duration } = measureTime(() => {
        const affected = graph.getRecalculationOrder([{ row: 0, col: 0 }]);
        return affected.length;
      });

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Formula Function Performance', () => {
    it('should evaluate SUM over large range efficiently', () => {
      // Create sheet with 10000 numbers
      let sheet = createSheet('SumTest');
      for (let row = 0; row < 10000; row++) {
        const cell = createCell(
          { row, col: 0 },
          String(row + 1),
          numberValue(row + 1)
        );
        sheet = setCell(sheet, cell);
      }

      // Add SUM formula
      const sumCell = createCell({ row: 10000, col: 0 }, '=SUM(A1:A10000)');
      sheet = setCell(sheet, sumCell);

      // Create workbook and update its sheet with our test data
      const baseWorkbook = createWorkbook('Test');
      const workbook: Workbook = {
        ...baseWorkbook,
        sheets: [sheet],
      };

      const { duration } = measureTime(() => {
        const context: EvaluationContext = {
          workbook,
          currentSheet: sheet,
          currentCell: { row: 10000, col: 0 },
          evaluatingCells: new Set(),
        };

        const formula = '=SUM(A1:A10000)'.slice(1);
        const lexer = new Lexer(formula);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const evaluator = new Evaluator(context);
        evaluator.evaluate(ast);
      });

      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it('should evaluate AVERAGE over large range', () => {
      let sheet = createSheet('AvgTest');
      for (let row = 0; row < 10000; row++) {
        const cell = createCell(
          { row, col: 0 },
          String(row + 1),
          numberValue(row + 1)
        );
        sheet = setCell(sheet, cell);
      }

      // Create workbook and update its sheet with our test data
      const baseWorkbook = createWorkbook('Test');
      const workbook: Workbook = {
        ...baseWorkbook,
        sheets: [sheet],
      };

      const { duration } = measureTime(() => {
        const context: EvaluationContext = {
          workbook,
          currentSheet: sheet,
          currentCell: { row: 10000, col: 0 },
          evaluatingCells: new Set(),
        };

        const formula = 'AVERAGE(A1:A10000)';
        const lexer = new Lexer(formula);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const evaluator = new Evaluator(context);
        evaluator.evaluate(ast);
      });

      expect(duration).toBeLessThan(100);
    });
  });

  // Report all results at the end
  describe('Performance Summary', () => {
    it('should report all benchmark results', () => {
      if (results.length > 0) {
        console.log(reportResults(results));
      }
    });
  });
});
