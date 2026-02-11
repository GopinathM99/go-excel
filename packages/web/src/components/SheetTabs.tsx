import { useSpreadsheetStore } from '../store/spreadsheet';
import './SheetTabs.css';

export function SheetTabs() {
  const sheets = useSpreadsheetStore((state) => state.sheets);
  const activeSheetId = useSpreadsheetStore((state) => state.activeSheetId);
  const addSheet = useSpreadsheetStore((state) => state.addSheet);
  const switchSheet = useSpreadsheetStore((state) => state.switchSheet);

  return (
    <div className="sheet-tabs">
      <button className="sheet-tab-add" title="Add sheet" onClick={addSheet}>
        +
      </button>
      <div className="sheet-tabs-list">
        {sheets.map((sheet) => (
          <button
            key={sheet.id}
            className={`sheet-tab${sheet.id === activeSheetId ? ' active' : ''}`}
            onClick={() => switchSheet(sheet.id)}
          >
            {sheet.name}
          </button>
        ))}
      </div>
      <div className="sheet-tabs-scroll">
        <button className="sheet-nav-button" title="Scroll left">
          &#9664;
        </button>
        <button className="sheet-nav-button" title="Scroll right">
          &#9654;
        </button>
      </div>
    </div>
  );
}
