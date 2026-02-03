/**
 * Auto-Filter UI Components
 *
 * Provides Excel-like filtering functionality for the grid:
 * - FilterDropdown: Button that appears in header cells to open filter menu
 * - FilterMenu: Dropdown menu with filter options (values, text, number filters)
 * - FilterCondition: Condition builder for custom filters
 *
 * Usage:
 * ```tsx
 * import { FilterDropdown, FilterMenu } from './Filter';
 * import { useFilter } from '../../hooks/useFilter';
 *
 * function Header({ column }) {
 *   const { isFilterEnabled, hasActiveFilter, openMenuColumn, setOpenMenuColumn } = useFilter(sheet);
 *
 *   return (
 *     <div className="column-header">
 *       {columnLabel}
 *       {isFilterEnabled && (
 *         <FilterDropdown
 *           column={column}
 *           hasActiveFilter={hasActiveFilter(column)}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

// Components
export { FilterDropdown } from './FilterDropdown';
export { FilterMenu } from './FilterMenu';
export { FilterCondition, ConditionBuilder } from './FilterCondition';

// Hook
export { useFilter, useFilterStore } from '../../hooks/useFilter';

// Types
export type {
  FilterOperator,
  FilterCondition as FilterConditionType,
  ColumnFilter,
  AutoFilter,
  FilterResult,
} from '../../hooks/useFilter';

// CSS imports (for consumers who want to import styles)
import './FilterDropdown.css';
import './FilterMenu.css';
import './FilterCondition.css';
