import './FormulaBar.css';

export function FormulaBar() {
  return (
    <div className="formula-bar">
      <div className="formula-bar-name-box">
        <input type="text" className="name-box-input" placeholder="A1" readOnly />
      </div>
      <div className="formula-bar-fx">
        <span className="fx-label">fx</span>
      </div>
      <div className="formula-bar-input-container">
        <input type="text" className="formula-input" placeholder="" />
      </div>
    </div>
  );
}
