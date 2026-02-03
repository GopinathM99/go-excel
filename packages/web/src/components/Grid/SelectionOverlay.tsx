import { memo } from 'react';
import './SelectionOverlay.css';

interface SelectionOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SelectionOverlay = memo(function SelectionOverlay({
  x,
  y,
  width,
  height,
}: SelectionOverlayProps) {
  return (
    <div
      className="selection-overlay"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width,
        height,
      }}
    >
      {/* Fill handle (small square at bottom-right corner) */}
      <div className="fill-handle" />
    </div>
  );
});
