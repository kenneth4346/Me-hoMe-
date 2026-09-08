/**
 * Door/window distance dimension labels.
 */
import type { Wall, Door, Window as Win } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength } from '$lib/stores/settings';
import { wallLength } from '$lib/utils/wallEditing';
import { wallPointAt, wts } from './geometry';

// ── Door/Window distance dimensions ──────────────────────────────────

export function drawDoorDistanceDimensions(cs: CanvasState, wall: Wall, door: Door, dimSettings: ProjectSettings): void {
  const { ctx, zoom } = cs;
  const wLength = wallLength(wall);
  if (wLength < 10) return;

  const distFromA = wLength * door.position;
  const distFromB = wLength * (1 - door.position);

  const doorCenter = wallPointAt(wall, door.position);
  const dcScreen = wts(cs, doorCenter.x, doorCenter.y);
  const wallStartScreen = wts(cs, wall.start.x, wall.start.y);
  const wallEndScreen = wts(cs, wall.end.x, wall.end.y);

  if (dimSettings.showExtensionLines) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(dcScreen.x, dcScreen.y); ctx.lineTo(wallStartScreen.x, wallStartScreen.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dcScreen.x, dcScreen.y); ctx.lineTo(wallEndScreen.x, wallEndScreen.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [midPoint, dist] of [
    [{ x: (dcScreen.x + wallStartScreen.x) / 2, y: (dcScreen.y + wallStartScreen.y) / 2 }, distFromA],
    [{ x: (dcScreen.x + wallEndScreen.x) / 2, y: (dcScreen.y + wallEndScreen.y) / 2 }, distFromB],
  ] as [{ x: number; y: number }, number][]) {
    const labelText = formatLength(dist, dimSettings.units);
    const textWidth = ctx.measureText(labelText).width;
    const pillWidth = textWidth + 12;
    const pillHeight = fontSize + 6;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(midPoint.x - pillWidth / 2, midPoint.y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, midPoint.x, midPoint.y);
  }
}

export function drawWindowDistanceDimensions(cs: CanvasState, wall: Wall, window: Win, dimSettings: ProjectSettings): void {
  const { ctx, zoom } = cs;
  const wLength = wallLength(wall);
  if (wLength < 10) return;

  const distFromA = wLength * window.position;
  const distFromB = wLength * (1 - window.position);

  const windowCenter = wallPointAt(wall, window.position);
  const wcScreen = wts(cs, windowCenter.x, windowCenter.y);
  const wallStartScreen = wts(cs, wall.start.x, wall.start.y);
  const wallEndScreen = wts(cs, wall.end.x, wall.end.y);

  if (dimSettings.showExtensionLines) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(wcScreen.x, wcScreen.y); ctx.lineTo(wallStartScreen.x, wallStartScreen.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wcScreen.x, wcScreen.y); ctx.lineTo(wallEndScreen.x, wallEndScreen.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [midPoint, dist] of [
    [{ x: (wcScreen.x + wallStartScreen.x) / 2, y: (wcScreen.y + wallStartScreen.y) / 2 }, distFromA],
    [{ x: (wcScreen.x + wallEndScreen.x) / 2, y: (wcScreen.y + wallEndScreen.y) / 2 }, distFromB],
  ] as [{ x: number; y: number }, number][]) {
    const labelText = formatLength(dist, dimSettings.units);
    const textWidth = ctx.measureText(labelText).width;
    const pillWidth = textWidth + 12;
    const pillHeight = fontSize + 6;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(midPoint.x - pillWidth / 2, midPoint.y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, midPoint.x, midPoint.y);
  }
}
