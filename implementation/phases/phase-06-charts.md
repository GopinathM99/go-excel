# Phase 6: Charts

**Status:** ✅ Complete
**Sprint:** 6
**Goal:** Basic chart types with live updates
**Last Updated:** 2024-01-31

---

## Tasks

### 1. Chart Engine Integration (Medium) ✅ COMPLETE
- [x] Chart data model linking to cell ranges
- [x] Live updates when source data changes (dependency tracking)
- [x] ChartDataProvider for data extraction
- [x] ChartManager for collection management
- [x] Series in rows or columns
- [x] Label extraction from first row/column
- [x] Caching and refresh detection

**Files Created:**
- `packages/core/src/charts/ChartTypes.ts`
- `packages/core/src/charts/ChartModel.ts`
- `packages/core/src/charts/ChartDataProvider.ts`
- `packages/core/src/charts/ChartManager.ts`
- `packages/core/src/charts/index.ts`

**Tests:** 105 passing tests

### 2. Basic Chart Types (Medium) ✅ COMPLETE
- [x] Integrate ECharts charting library
- [x] Bar/Column charts (horizontal and vertical)
- [x] Line charts (with smooth/straight, area options)
- [x] Pie charts (with donut variant)
- [x] Basic styling (colors, legends, tooltips)
- [x] Export as image option

**Files Created:**
- `packages/web/src/components/Charts/ChartContainer.tsx`
- `packages/web/src/components/Charts/BarChart.tsx`
- `packages/web/src/components/Charts/LineChart.tsx`
- `packages/web/src/components/Charts/PieChart.tsx`
- `packages/web/src/hooks/useChart.ts`

### 3. Chart Editor UI (Small) ✅ COMPLETE
- [x] Chart type selection with subtypes
- [x] Data range picker with preview
- [x] Title and axis labels
- [x] Legend positioning
- [x] Style editor (colors, fonts, borders)

**Files Created:**
- `packages/web/src/components/ChartEditor/ChartEditorDialog.tsx`
- `packages/web/src/components/ChartEditor/ChartTypeSelector.tsx`
- `packages/web/src/components/ChartEditor/DataRangePicker.tsx`
- `packages/web/src/components/ChartEditor/ChartStyleEditor.tsx`
- `packages/web/src/components/ChartEditor/AxisEditor.tsx`
- `packages/web/src/components/ChartEditor/LegendEditor.tsx`
- `packages/web/src/hooks/useChartEditor.ts`

---

## Key Files to Create

```
packages/core/src/
├── charts/
│   ├── index.ts
│   ├── ChartModel.ts               # Chart data model
│   ├── ChartDataProvider.ts        # Binds chart to cell ranges
│   └── ChartTypes.ts               # Type definitions

packages/web/src/
├── components/
│   ├── Charts/
│   │   ├── index.tsx
│   │   ├── ChartContainer.tsx      # Wrapper for chart library
│   │   ├── BarChart.tsx
│   │   ├── LineChart.tsx
│   │   └── PieChart.tsx
│   └── ChartEditor/
│       ├── index.tsx
│       ├── ChartTypeSelector.tsx
│       ├── DataRangePicker.tsx
│       ├── ChartStyleEditor.tsx
│       └── AxisEditor.tsx
```

---

## Technical Implementation

### Chart Model
```typescript
interface ChartModel {
  id: string;
  type: ChartType;
  title?: string;

  // Data binding
  dataRange: CellRange;
  seriesInRows: boolean;  // true = rows are series, false = columns are series
  firstRowIsLabels: boolean;
  firstColIsLabels: boolean;

  // Positioning
  position: {
    sheet: string;
    anchor: CellAddress;
    width: number;   // in pixels
    height: number;
  };

  // Styling
  style: ChartStyle;

  // Axes (for non-pie charts)
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;

  // Legend
  legend?: LegendConfig;
}

type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'area' | 'scatter';

interface ChartStyle {
  colors?: string[];
  backgroundColor?: string;
  borderColor?: string;
  fontFamily?: string;
}

interface AxisConfig {
  title?: string;
  min?: number;
  max?: number;
  gridLines?: boolean;
}

interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}
```

### Chart Data Provider
```typescript
class ChartDataProvider {
  private chart: ChartModel;
  private sheet: Sheet;

  constructor(chart: ChartModel, sheet: Sheet) {
    this.chart = chart;
    this.sheet = sheet;
  }

  // Extract data for charting library
  getData(): ChartData {
    const cells = getCellsInRange(this.sheet, this.chart.dataRange);
    // Transform to chart-friendly format
    return {
      labels: this.getLabels(cells),
      series: this.getSeries(cells),
    };
  }

  // Get cells that the chart depends on
  getDependencies(): CellAddress[] {
    return Array.from(iterateRange(this.chart.dataRange));
  }
}
```

### Dependencies to Add
```json
{
  "dependencies": {
    "echarts": "^5.5.0",
    "echarts-for-react": "^3.0.2"
  }
}
```

Alternative (lighter weight):
```json
{
  "dependencies": {
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0"
  }
}
```

---

## ECharts vs Chart.js Comparison

| Feature | ECharts | Chart.js |
|---------|---------|----------|
| Bundle size | ~1MB | ~200KB |
| Chart types | Many | Basic + plugins |
| Customization | Extensive | Good |
| Performance | Excellent | Good |
| Excel-like look | Better | Requires work |
| TypeScript | Good | Good |

**Recommendation:** ECharts for more Excel-like appearance and features

---

## Verification

- [ ] Create each chart type
- [ ] Modify source data, verify chart updates
- [ ] Test chart positioning
- [ ] Test chart resizing
- [ ] Verify chart persists in save/load
