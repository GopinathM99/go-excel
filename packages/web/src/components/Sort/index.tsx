/**
 * Sort Components
 *
 * React components for sort functionality in the MS Excel Clone.
 *
 * Components:
 * - SortDialog: Modal dialog for configuring multi-column sort
 * - SortLevel: Individual sort level configuration (column, order)
 *
 * Usage:
 * ```tsx
 * import { SortDialog } from './components/Sort';
 *
 * function App() {
 *   const [showSortDialog, setShowSortDialog] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setShowSortDialog(true)}>Sort</button>
 *       <SortDialog
 *         isOpen={showSortDialog}
 *         onClose={() => setShowSortDialog(false)}
 *         onSort={() => console.log('Sorted!')}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

export { SortDialog } from './SortDialog';
export { SortLevel } from './SortLevel';

// Re-export hook types for convenience
export type { SortConfig, SortLevel as SortLevelType, ColumnOption } from '../../hooks/useSort';
