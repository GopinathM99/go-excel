import './SheetTabs.css';

export function SheetTabs() {
  return (
    <div className="sheet-tabs">
      <button className="sheet-tab-add" title="Add sheet">+</button>
      <div className="sheet-tabs-list">
        <button className="sheet-tab active">Sheet1</button>
      </div>
      <div className="sheet-tabs-scroll">
        <button className="sheet-nav-button" title="Scroll left">◀</button>
        <button className="sheet-nav-button" title="Scroll right">▶</button>
      </div>
    </div>
  );
}
