import { useCallback, useMemo } from 'react';
import { create } from 'zustand';
import type {
  FilterOperator,
  FilterCondition,
  ColumnFilter,
  AutoFilter,
  FilterResult,
} from '@excel/core';
import {
  createAutoFilter,
  setColumnFilter,
  clearColumnFilter,
  clearAllFilters,
  applyFilter,
  getUniqueValues,
  createValueFilter,
  createConditionFilter,
} from '@excel/core';
import type { Sheet } from '@excel/core';
import type { CellRange } from '@excel/core';

/**
 * Filter store state
 */
interface FilterState {
  // Auto-filter configuration
  autoFilter: AutoFilter | null;

  // Filter enabled state
  isFilterEnabled: boolean;

  // Active column filters (column index -> filter)
  activeFilters: Map<number, ColumnFilter>;

  // Hidden rows from filtering
  hiddenRows: Set<number>;

  // Currently open filter menu column
  openMenuColumn: number | null;

  // Actions
  enableAutoFilter: (range: CellRange) => void;
  disableAutoFilter: () => void;
  setColumnFilter: (column: number, filter: ColumnFilter) => void;
  clearColumnFilter: (column: number) => void;
  clearAllFilters: () => void;
  setHiddenRows: (rows: Set<number>) => void;
  setOpenMenuColumn: (column: number | null) => void;
  hasActiveFilter: (column: number) => boolean;
}

/**
 * Zustand store for filter state
 */
export const useFilterStore = create<FilterState>((set, get) => ({
  autoFilter: null,
  isFilterEnabled: false,
  activeFilters: new Map(),
  hiddenRows: new Set(),
  openMenuColumn: null,

  enableAutoFilter: (range: CellRange) => {
    const autoFilter: AutoFilter = {
      range,
      filters: new Map(),
    };
    set({
      autoFilter,
      isFilterEnabled: true,
      activeFilters: new Map(),
      hiddenRows: new Set(),
    });
  },

  disableAutoFilter: () => {
    set({
      autoFilter: null,
      isFilterEnabled: false,
      activeFilters: new Map(),
      hiddenRows: new Set(),
      openMenuColumn: null,
    });
  },

  setColumnFilter: (column: number, filter: ColumnFilter) => {
    set((state) => {
      const newFilters = new Map(state.activeFilters);
      newFilters.set(column, filter);

      // Update auto-filter if it exists
      if (state.autoFilter) {
        state.autoFilter.filters.set(column, filter);
      }

      return { activeFilters: newFilters };
    });
  },

  clearColumnFilter: (column: number) => {
    set((state) => {
      const newFilters = new Map(state.activeFilters);
      newFilters.delete(column);

      // Update auto-filter if it exists
      if (state.autoFilter) {
        state.autoFilter.filters.delete(column);
      }

      return { activeFilters: newFilters };
    });
  },

  clearAllFilters: () => {
    set((state) => {
      if (state.autoFilter) {
        state.autoFilter.filters.clear();
      }
      return {
        activeFilters: new Map(),
        hiddenRows: new Set(),
      };
    });
  },

  setHiddenRows: (rows: Set<number>) => {
    set({ hiddenRows: rows });
  },

  setOpenMenuColumn: (column: number | null) => {
    set({ openMenuColumn: column });
  },

  hasActiveFilter: (column: number) => {
    return get().activeFilters.has(column);
  },
}));

/**
 * Hook to manage auto-filter functionality
 */
export function useFilter(sheet: Sheet | null) {
  const {
    autoFilter,
    isFilterEnabled,
    activeFilters,
    hiddenRows,
    openMenuColumn,
    enableAutoFilter,
    disableAutoFilter,
    setColumnFilter: storeSetColumnFilter,
    clearColumnFilter: storeClearColumnFilter,
    clearAllFilters: storeClearAllFilters,
    setHiddenRows,
    setOpenMenuColumn,
    hasActiveFilter,
  } = useFilterStore();

  /**
   * Toggle auto-filter on/off for a range
   */
  const toggleAutoFilter = useCallback(
    (range: CellRange) => {
      if (isFilterEnabled) {
        disableAutoFilter();
      } else {
        enableAutoFilter(range);
      }
    },
    [isFilterEnabled, enableAutoFilter, disableAutoFilter]
  );

  /**
   * Get unique values for a column
   */
  const getColumnUniqueValues = useCallback(
    (column: number): string[] => {
      if (!sheet || !autoFilter) return [];
      return getUniqueValues(sheet, autoFilter.range, column);
    },
    [sheet, autoFilter]
  );

  /**
   * Apply a value-based filter to a column
   */
  const applyValueFilter = useCallback(
    (column: number, values: string[]) => {
      const filter = createValueFilter(values);
      storeSetColumnFilter(column, filter);

      // Recalculate hidden rows
      if (sheet && autoFilter) {
        const updatedFilter: AutoFilter = {
          ...autoFilter,
          filters: new Map(activeFilters).set(column, filter),
        };
        const result = applyFilter(sheet, updatedFilter);
        setHiddenRows(new Set(result.hiddenRows));
      }
    },
    [sheet, autoFilter, activeFilters, storeSetColumnFilter, setHiddenRows]
  );

  /**
   * Apply a condition-based filter to a column
   */
  const applyConditionFilter = useCallback(
    (column: number, conditions: FilterCondition[], logic: 'and' | 'or' = 'and') => {
      const filter = createConditionFilter(conditions, logic);
      storeSetColumnFilter(column, filter);

      // Recalculate hidden rows
      if (sheet && autoFilter) {
        const updatedFilter: AutoFilter = {
          ...autoFilter,
          filters: new Map(activeFilters).set(column, filter),
        };
        const result = applyFilter(sheet, updatedFilter);
        setHiddenRows(new Set(result.hiddenRows));
      }
    },
    [sheet, autoFilter, activeFilters, storeSetColumnFilter, setHiddenRows]
  );

  /**
   * Clear filter for a specific column
   */
  const clearFilter = useCallback(
    (column: number) => {
      storeClearColumnFilter(column);

      // Recalculate hidden rows
      if (sheet && autoFilter) {
        const updatedFilters = new Map(activeFilters);
        updatedFilters.delete(column);

        const updatedFilter: AutoFilter = {
          ...autoFilter,
          filters: updatedFilters,
        };
        const result = applyFilter(sheet, updatedFilter);
        setHiddenRows(new Set(result.hiddenRows));
      }
    },
    [sheet, autoFilter, activeFilters, storeClearColumnFilter, setHiddenRows]
  );

  /**
   * Clear all column filters
   */
  const clearAll = useCallback(() => {
    storeClearAllFilters();
    setHiddenRows(new Set());
  }, [storeClearAllFilters, setHiddenRows]);

  /**
   * Check if a row is visible (not filtered out)
   */
  const isRowVisible = useCallback(
    (row: number): boolean => {
      return !hiddenRows.has(row);
    },
    [hiddenRows]
  );

  /**
   * Get filter result summary
   */
  const filterResult = useMemo((): FilterResult | null => {
    if (!sheet || !autoFilter || activeFilters.size === 0) return null;
    return applyFilter(sheet, { ...autoFilter, filters: activeFilters });
  }, [sheet, autoFilter, activeFilters]);

  /**
   * Get the current filter for a column
   */
  const getColumnFilter = useCallback(
    (column: number): ColumnFilter | undefined => {
      return activeFilters.get(column);
    },
    [activeFilters]
  );

  /**
   * Check if column is in filter range
   */
  const isColumnInFilterRange = useCallback(
    (column: number): boolean => {
      if (!autoFilter) return false;
      return column >= autoFilter.range.start.col && column <= autoFilter.range.end.col;
    },
    [autoFilter]
  );

  /**
   * Get filter range
   */
  const filterRange = useMemo(() => {
    return autoFilter?.range ?? null;
  }, [autoFilter]);

  return {
    // State
    isFilterEnabled,
    autoFilter,
    activeFilters,
    hiddenRows,
    openMenuColumn,
    filterRange,
    filterResult,

    // Actions
    toggleAutoFilter,
    enableAutoFilter,
    disableAutoFilter,
    applyValueFilter,
    applyConditionFilter,
    clearFilter,
    clearAll,
    setOpenMenuColumn,

    // Queries
    getColumnUniqueValues,
    getColumnFilter,
    hasActiveFilter,
    isRowVisible,
    isColumnInFilterRange,
  };
}

export type { FilterOperator, FilterCondition, ColumnFilter, AutoFilter, FilterResult };
