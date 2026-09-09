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
  const r = (col.diameter / 2) * zoom;

  ctx.save();
  ctx.translate(s.x, s.y);

  if (col.shape === 'round') {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#bfdbfe' : col.color; ctx.fill();
    ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = selected ? 2 : 1; ctx.stroke();
    ctx.strokeStyle = selected ? '#3b82f680' : '#88888880'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.moveTo(-r, r); ctx.lineTo(r, -r); ctx.stroke();
  } else {
    const angle = (col.rotation * Math.PI) / 180;
    ctx.rotate(angle);
    const side = col.diameter * zoom;
    ctx.fillStyle = selected ? '#bfdbfe' : col.color;
    ctx.fillRect(-side / 2, -side / 2, side, side);
    ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(-side / 2, -side / 2, side, side);
    ctx.strokeStyle = selected ? '#3b82f680' : '#88888880'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-side / 2, -side / 2); ctx.lineTo(side / 2, side / 2); ctx.moveTo(-side / 2, side / 2); ctx.lineTo(side / 2, -side / 2); ctx.stroke();
  }

  if (selected) {
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    if (col.shape === 'round') {
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
    } else {
      const side = col.diameter * zoom;
      ctx.strokeRect(-side / 2 - 4, -side / 2 - 4, side + 8, side + 8);
    }
    ctx.setLineDash([]);
  }

  ctx.restore();
}
