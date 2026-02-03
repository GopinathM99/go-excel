import type { CellAddress } from '../models/CellAddress';
import type { CellRange } from '../models/CellRange';
import type { ASTNode } from './AST';
import { cellAddressKey } from '../models/CellAddress';
import { iterateRange } from '../models/CellRange';
import { getCellReferences, getRangeReferences } from './AST';

/**
 * Represents dependencies for a single cell
 */
interface CellDependencies {
  /** Cells that this cell depends on (references in its formula) */
  dependsOn: Set<string>;
  /** Cells that depend on this cell (have this cell in their formulas) */
  dependents: Set<string>;
}

/**
 * Dependency graph for tracking formula dependencies
 */
export class DependencyGraph {
  private dependencies: Map<string, CellDependencies> = new Map();

  /**
   * Get or create dependency entry for a cell
   */
  private getOrCreate(key: string): CellDependencies {
    let deps = this.dependencies.get(key);
    if (!deps) {
      deps = { dependsOn: new Set(), dependents: new Set() };
      this.dependencies.set(key, deps);
    }
    return deps;
  }

  /**
   * Update dependencies for a cell based on its formula AST
   */
  updateDependencies(address: CellAddress, ast: ASTNode | null): void {
    const key = cellAddressKey(address);
    const deps = this.getOrCreate(key);

    // Clear old dependencies
    for (const oldDep of deps.dependsOn) {
      const oldDepEntry = this.dependencies.get(oldDep);
      if (oldDepEntry) {
        oldDepEntry.dependents.delete(key);
      }
    }
    deps.dependsOn.clear();

    // If no AST, the cell has no formula dependencies
    if (!ast) return;

    // Extract cell references from AST
    const cellRefs = getCellReferences(ast);
    const rangeRefs = getRangeReferences(ast);

    // Add dependencies for individual cell references
    for (const ref of cellRefs) {
      const refKey = cellAddressKey(ref);
      deps.dependsOn.add(refKey);
      this.getOrCreate(refKey).dependents.add(key);
    }

    // Add dependencies for range references
    for (const range of rangeRefs) {
      for (const addr of iterateRange(range)) {
        const refKey = cellAddressKey(addr);
        deps.dependsOn.add(refKey);
        this.getOrCreate(refKey).dependents.add(key);
      }
    }
  }

  /**
   * Remove a cell from the dependency graph
   */
  removeCell(address: CellAddress): void {
    const key = cellAddressKey(address);
    const deps = this.dependencies.get(key);

    if (!deps) return;

    // Remove this cell from all its dependencies' dependents lists
    for (const depKey of deps.dependsOn) {
      const depEntry = this.dependencies.get(depKey);
      if (depEntry) {
        depEntry.dependents.delete(key);
      }
    }

    // Remove this cell from all its dependents' dependsOn lists
    for (const dependentKey of deps.dependents) {
      const dependentEntry = this.dependencies.get(dependentKey);
      if (dependentEntry) {
        dependentEntry.dependsOn.delete(key);
      }
    }

    this.dependencies.delete(key);
  }

  /**
   * Get all cells that depend on the given cell (direct dependents)
   */
  getDependents(address: CellAddress): CellAddress[] {
    const key = cellAddressKey(address);
    const deps = this.dependencies.get(key);

    if (!deps) return [];

    return Array.from(deps.dependents).map(this.parseKey);
  }

  /**
   * Get all cells that the given cell depends on (direct dependencies)
   */
  getDependencies(address: CellAddress): CellAddress[] {
    const key = cellAddressKey(address);
    const deps = this.dependencies.get(key);

    if (!deps) return [];

    return Array.from(deps.dependsOn).map(this.parseKey);
  }

  /**
   * Get all cells that need to be recalculated when the given cell changes
   * Returns cells in topological order (dependencies before dependents)
   */
  getRecalculationOrder(changedCells: CellAddress[]): CellAddress[] {
    const visited = new Set<string>();
    const order: string[] = [];

    // Start with the changed cells
    const queue = changedCells.map(cellAddressKey);

    while (queue.length > 0) {
      const key = queue.shift()!;

      if (visited.has(key)) continue;
      visited.add(key);

      const deps = this.dependencies.get(key);
      if (!deps) continue;

      // Add all dependents to the queue
      for (const dependentKey of deps.dependents) {
        if (!visited.has(dependentKey)) {
          queue.push(dependentKey);
        }
      }

      order.push(key);
    }

    // Topological sort using Kahn's algorithm
    return this.topologicalSort(order.map(this.parseKey));
  }

  /**
   * Topological sort of cells for calculation order
   */
  private topologicalSort(cells: CellAddress[]): CellAddress[] {
    const cellSet = new Set(cells.map(cellAddressKey));
    const inDegree = new Map<string, number>();
    const result: CellAddress[] = [];

    // Initialize in-degrees
    for (const cell of cells) {
      const key = cellAddressKey(cell);
      const deps = this.dependencies.get(key);
      if (deps) {
        // Count only dependencies within our cell set
        let count = 0;
        for (const depKey of deps.dependsOn) {
          if (cellSet.has(depKey)) {
            count++;
          }
        }
        inDegree.set(key, count);
      } else {
        inDegree.set(key, 0);
      }
    }

    // Find all cells with no dependencies (in-degree 0)
    const queue: CellAddress[] = [];
    for (const cell of cells) {
      const key = cellAddressKey(cell);
      if (inDegree.get(key) === 0) {
        queue.push(cell);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const cell = queue.shift()!;
      result.push(cell);

      const key = cellAddressKey(cell);
      const deps = this.dependencies.get(key);

      if (deps) {
        for (const dependentKey of deps.dependents) {
          if (!cellSet.has(dependentKey)) continue;

          const currentDegree = inDegree.get(dependentKey) ?? 0;
          const newDegree = currentDegree - 1;
          inDegree.set(dependentKey, newDegree);

          if (newDegree === 0) {
            queue.push(this.parseKey(dependentKey));
          }
        }
      }
    }

    return result;
  }

  /**
   * Detect if there's a circular reference involving the given cell
   */
  hasCircularReference(address: CellAddress): boolean {
    const startKey = cellAddressKey(address);
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (key: string): boolean => {
      if (stack.has(key)) {
        return true; // Found cycle
      }
      if (visited.has(key)) {
        return false; // Already processed, no cycle through this path
      }

      visited.add(key);
      stack.add(key);

      const deps = this.dependencies.get(key);
      if (deps) {
        for (const depKey of deps.dependsOn) {
          if (dfs(depKey)) {
            return true;
          }
        }
      }

      stack.delete(key);
      return false;
    };

    return dfs(startKey);
  }

  /**
   * Get all cells involved in a circular reference with the given cell
   */
  getCircularReferenceCells(address: CellAddress): CellAddress[] {
    const startKey = cellAddressKey(address);
    const visited = new Set<string>();
    const path: string[] = [];
    const cycle: string[] = [];

    const dfs = (key: string): boolean => {
      const pathIndex = path.indexOf(key);
      if (pathIndex !== -1) {
        // Found cycle - extract the cycle from the path
        cycle.push(...path.slice(pathIndex));
        return true;
      }
      if (visited.has(key)) {
        return false;
      }

      visited.add(key);
      path.push(key);

      const deps = this.dependencies.get(key);
      if (deps) {
        for (const depKey of deps.dependsOn) {
          if (dfs(depKey)) {
            return true;
          }
        }
      }

      path.pop();
      return false;
    };

    dfs(startKey);
    return cycle.map(this.parseKey);
  }

  /**
   * Clear all dependencies
   */
  clear(): void {
    this.dependencies.clear();
  }

  /**
   * Get the number of cells in the graph
   */
  get size(): number {
    return this.dependencies.size;
  }

  /**
   * Parse a key back into a CellAddress
   */
  private parseKey = (key: string): CellAddress => {
    const parts = key.split(',');
    if (parts.length === 2) {
      return {
        row: parseInt(parts[0]!, 10),
        col: parseInt(parts[1]!, 10),
      };
    }
    // Handle sheet-qualified keys
    const [sheetPart, rest] = key.split('!');
    const [row, col] = rest!.split(',');
    return {
      row: parseInt(row!, 10),
      col: parseInt(col!, 10),
      sheetName: sheetPart,
    };
  };
}
