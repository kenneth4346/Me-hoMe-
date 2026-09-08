/**
 * Column drawing.
 */
import type { Column } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { wts } from './geometry';

// ── Column drawing ───────────────────────────────────────────────────

export function drawColumn(cs: CanvasState, col: Column, selected: boolean): void {
  const { ctx, zoom } = cs;
  const s = wts(cs, col.position.x, col.position.y);
  const color = col.color || '#999999';

  ctx.save();
  ctx.translate(s.x, s.y);

  if (col.shape === 'round') {
    const r = (col.width / 2) * zoom;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else {
    const w = col.width * zoom;
    const d = col.depth * zoom;
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -d / 2, w, d);
    if (selected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(-w / 2, -d / 2, w, d);
  }

  ctx.restore();
}
