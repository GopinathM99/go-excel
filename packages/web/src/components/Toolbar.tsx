import './Toolbar.css';

export function Toolbar() {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-button" title="Bold">
          <strong>B</strong>
        </button>
        <button className="toolbar-button" title="Italic">
          <em>I</em>
        </button>
        <button className="toolbar-button" title="Underline">
          <u>U</u>
        </button>
      </div>
      <div className="toolbar-separator" />
      <div className="toolbar-group">
        <button className="toolbar-button" title="Align Left">⬅</button>
        <button className="toolbar-button" title="Align Center">⬌</button>
        <button className="toolbar-button" title="Align Right">➡</button>
      </div>
    </div>
  );
}
