import { memo } from 'react';
import './SelectionOverlay.css';

interface SelectionOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onFillDragStart?: (e: React.MouseEvent) => void;
  fillPreview?: { x: number; y: number; width: number; height: number } | null;
}

export const SelectionOverlay = memo(function SelectionOverlay({
  x,
  y,
  width,
  height,
  onFillDragStart,
  fillPreview,
}: SelectionOverlayProps) {
  return (
    <>
      <div
        className="selection-overlay"
        style={{
          transform: `translate(${String(x)}px, ${String(y)}px)`,
          width,
          height,
        }}
      >
        {/* Fill handle (small square at bottom-right corner) */}
        <div
          className="fill-handle"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onFillDragStart?.(e);
          }}
        />
      </div>
      {fillPreview && (
        <div
          className="fill-preview"
          style={{
            transform: `translate(${String(fillPreview.x)}px, ${String(fillPreview.y)}px)`,
            width: fillPreview.width,
            height: fillPreview.height,
          }}
        />
      )}
    </>
  );
});
