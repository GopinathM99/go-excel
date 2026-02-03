import { Grid } from './Grid';
import { FormulaBar } from './FormulaBar';
import { Toolbar } from './Toolbar';
import { SheetTabs } from './SheetTabs';
import './Spreadsheet.css';

export function Spreadsheet() {
  return (
    <div className="spreadsheet">
      <Toolbar />
      <FormulaBar />
      <div className="spreadsheet-content">
        <Grid />
      </div>
      <SheetTabs />
    </div>
  );
}
