/**
 * Canvas geometry helpers + grid/wall drawing.
 * Split from canvasRenderer for GitHub MCP ~25KB content limits.
 */
import type { Point, Wall } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength } from '$lib/stores/settings';
import { getWallTextureCanvas } from '$lib/utils/textureGenerator';
import { wallLength } from '$lib/utils/wallEditing';

// ── Wall geometry helpers ────────────────────────────────────────────

export function wallPointAt(w: Wall, t: number): Point {
  if (w.curvePoint) {
    const mt = 1 - t;
    return {
      x: mt * mt * w.start.x + 2 * mt * t * w.curvePoint.x + t * t * w.end.x,
      y: mt * mt * w.start.y + 2 * mt * t * w.curvePoint.y + t * t * w.end.y,
    };
  }
  return {
    x: w.start.x + (w.end.x - w.start.x) * t,
    y: w.start.y + (w.end.y - w.start.y) * t,
  };
}

export function wallTangentAt(w: Wall, t: number): Point {
  if (w.curvePoint) {
    const mt = 1 - t;
    const dx = 2 * mt * (w.curvePoint.x - w.start.x) + 2 * t * (w.end.x - w.curvePoint.x);
    const dy = 2 * mt * (w.curvePoint.y - w.start.y) + 2 * t * (w.end.y - w.curvePoint.y);
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function wallThicknessScreen(w: Wall, zoom: number): number {
  return Math.max(w.thickness * zoom, 4);
}

/**
 * Half-thickness insets at each end of a wall caused by abutting
 * (non-collinear) neighbor walls. Used for edge-to-edge ("clear span")
 * dimensions: centerline length minus these insets is the distance
 * between the neighbors' inner faces.
 */
export function wallEdgeInsets(w: Wall, allWalls: Wall[]): { start: number; end: number } {
  const EP = 5;
  const wdx = w.end.x - w.start.x, wdy = w.end.y - w.start.y;
  const wl = Math.hypot(wdx, wdy) || 1;
  const insetAt = (pt: Point): number => {
    let inset = 0;
    for (const other of allWalls) {
      if (other.id === w.id) continue;
      const touchesStart = Math.abs(other.start.x - pt.x) < EP && Math.abs(other.start.y - pt.y) < EP;
      const touchesEnd = Math.abs(other.end.x - pt.x) < EP && Math.abs(other.end.y - pt.y) < EP;
      if (!touchesStart && !touchesEnd) continue;
      // Collinear continuations don't narrow the span — only crossing walls do
      const odx = other.end.x - other.start.x, ody = other.end.y - other.start.y;
      const ol = Math.hypot(odx, ody) || 1;
      const cross = Math.abs((wdx / wl) * (ody / ol) - (wdy / wl) * (odx / ol));
      if (cross < 0.1) continue;
      inset = Math.max(inset, other.thickness / 2);
    }
    return inset;
  };
  return { start: insetAt(w.start), end: insetAt(w.end) };
}

// ── Coordinate conversion (local helpers using CanvasState) ─────────

export function wts(cs: CanvasState, wx: number, wy: number): { x: number; y: number } {
  return { x: (wx - cs.camX) * cs.zoom + cs.width / 2, y: (wy - cs.camY) * cs.zoom + cs.height / 2 };
}

// ── Grid ─────────────────────────────────────────────────────────────

export function drawGrid(
  cs: CanvasState,
  showGrid: boolean,
  snapToGrid: boolean,
  gridSize: number,
): void {
  if (!cs.ctx || !showGrid) return;
  const { ctx, width, height, zoom, camX, camY } = cs;
  const GRID = 20;
  const step = (snapToGrid ? gridSize : GRID) * zoom;
  if (step < 4) return;

  ctx.strokeStyle = '#e8eaed';
  ctx.lineWidth = 0.5;
  const offX = (width / 2 - camX * zoom) % step;
  const offY = (height / 2 - camY * zoom) % step;
  for (let x = offX; x < width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = offY; y < height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  const majorStep = 100 * zoom;
  if (majorStep >= 20) {
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 0.8;
    const mOffX = (width / 2 - camX * zoom) % majorStep;
    const mOffY = (height / 2 - camY * zoom) % majorStep;
    for (let x = mOffX; x < width; x += majorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = mOffY; y < height; y += majorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }
}

// ── Wall drawing ─────────────────────────────────────────────────────

export function drawWall(
  cs: CanvasState,
  w: Wall,
  selected: boolean,
  showDimensions: boolean,
  dimSettings: ProjectSettings,
  allWalls?: Wall[],
): void {
  const { ctx, zoom, width, height } = cs;
  const s = wts(cs, w.start.x, w.start.y);
  const e = wts(cs, w.end.x, w.end.y);
  const thickness = wallThicknessScreen(w, zoom);

  if (w.curvePoint) {
    const cp = wts(cs, w.curvePoint.x, w.curvePoint.y);
    const SEGS = 24;
    const outerPts: { x: number; y: number }[] = [];
    const innerPts: { x: number; y: number }[] = [];

    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const mt = 1 - t;
      const px = mt * mt * s.x + 2 * mt * t * cp.x + t * t * e.x;
      const py = mt * mt * s.y + 2 * mt * t * cp.y + t * t * e.y;
      const tdx = 2 * mt * (cp.x - s.x) + 2 * t * (e.x - cp.x);
      const tdy = 2 * mt * (cp.y - s.y) + 2 * t * (e.y - cp.y);
      const tlen = Math.hypot(tdx, tdy) || 1;
      const nx = (-tdy / tlen) * thickness / 2;
      const ny = (tdx / tlen) * thickness / 2;
      outerPts.push({ x: px + nx, y: py + ny });
      innerPts.push({ x: px - nx, y: py - ny });
    }

    ctx.fillStyle = selected ? '#93c5fd' : '#404040';
    ctx.strokeStyle = selected ? '#3b82f6' : '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(outerPts[0].x, outerPts[0].y);
    for (let i = 1; i < outerPts.length; i++) ctx.lineTo(outerPts[i].x, outerPts[i].y);
    for (let i = innerPts.length - 1; i >= 0; i--) ctx.lineTo(innerPts[i].x, innerPts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const wlen = wallLength(w);
    if (wlen >= 10 && showDimensions && dimSettings.showExternalDimensions) {
      const midPt = wallPointAt(w, 0.5);
      const midS = wts(cs, midPt.x, midPt.y);
      const midTan = wallTangentAt(w, 0.5);
      const offsetDist = thickness / 2 + 16;
      ctx.fillStyle = dimSettings.dimensionLineColor;
      const fontSize = Math.max(10, 11 * zoom);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatLength(wlen, dimSettings.units), midS.x - midTan.y * offsetDist, midS.y + midTan.x * offsetDist);
    }

    if (selected) {
      const handleSize = 5;
      for (const pt of [s, e]) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      const sz = 6;
      ctx.beginPath();
      ctx.moveTo(cp.x, cp.y - sz);
      ctx.lineTo(cp.x + sz, cp.y);
      ctx.lineTo(cp.x, cp.y + sz);
      ctx.lineTo(cp.x - sz, cp.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#d9770680';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(cp.x, cp.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    return;
  }

  // Straight wall
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const nx = (-dy / len) * thickness / 2;
  const ny = (dx / len) * thickness / 2;

  ctx.fillStyle = selected ? '#93c5fd' : '#404040';
  ctx.strokeStyle = selected ? '#3b82f6' : '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s.x + nx, s.y + ny);
  ctx.lineTo(e.x + nx, e.y + ny);
  ctx.lineTo(e.x - nx, e.y - ny);
  ctx.lineTo(s.x - nx, s.y - ny);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wall texture pattern overlay
  if (w.texture) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s.x + nx, s.y + ny);
    ctx.lineTo(e.x + nx, e.y + ny);
    ctx.lineTo(e.x - nx, e.y - ny);
    ctx.lineTo(s.x - nx, s.y - ny);
    ctx.closePath();
    ctx.clip();

    const texCanvas = getWallTextureCanvas(w.texture, w.color);
    if (texCanvas) {
      const scale = zoom * 0.25;
      ctx.globalAlpha = 0.6;
      const angle = Math.atan2(dy, dx);
      const cxp = (s.x + e.x) / 2;
      const cyp = (s.y + e.y) / 2;
      ctx.translate(cxp, cyp);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      const pat = ctx.createPattern(texCanvas, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(-len / 2 / scale, -thickness / 2 / scale, len / scale, thickness / scale);
      }
    }
    ctx.restore();
  }

  // Dimension line with arrowheads
  if (!showDimensions || !dimSettings.showExternalDimensions) return;
  const wlen = wallLength(w);
  if (wlen < 10) return;

  // Edge-to-edge (clear span) mode: shorten the measured span by the
  // half-thickness of abutting walls at each end (issue #11).
  let dimLen = wlen;
  let insetS = 0, insetE = 0;
  if (dimSettings.wallMeasureMode === 'edge' && allWalls && !w.curvePoint) {
    const ins = wallEdgeInsets(w, allWalls);
    insetS = ins.start;
    insetE = ins.end;
    dimLen = Math.max(0, wlen - insetS - insetE);
  }
  const ux1 = dx / len, uy1 = dy / len;
  const sd = { x: s.x + ux1 * insetS * zoom, y: s.y + uy1 * insetS * zoom };
  const ed = { x: e.x - ux1 * insetE * zoom, y: e.y - uy1 * insetE * zoom };

  const mx = (sd.x + ed.x) / 2;
  const my = (sd.y + ed.y) / 2;
  const offsetDist = thickness / 2 + 20;
  const nnx = (-dy / len);
  const nny = (dx / len);

  let dimSide = 1;
  const testX = mx + nnx * offsetDist;
  const testY = my + nny * offsetDist;
  if (testX < 10 || testX > width - 10 || testY < 10 || testY > height - 10) dimSide = -1;

  const dOffX = nnx * offsetDist * dimSide;
  const dOffY = nny * offsetDist * dimSide;

  if (dimSettings.showExtensionLines) {
    const extLen = offsetDist + 4;
    ctx.strokeStyle = dimSettings.dimensionLineColor + '80';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(sd.x + nnx * (thickness / 2 + 2) * dimSide, sd.y + nny * (thickness / 2 + 2) * dimSide);
    ctx.lineTo(sd.x + nnx * extLen * dimSide, sd.y + nny * extLen * dimSide);
    ctx.moveTo(ed.x + nnx * (thickness / 2 + 2) * dimSide, ed.y + nny * (thickness / 2 + 2) * dimSide);
    ctx.lineTo(ed.x + nnx * extLen * dimSide, ed.y + nny * extLen * dimSide);
    ctx.stroke();
  }

  const ds = { x: sd.x + dOffX, y: sd.y + dOffY };
  const de = { x: ed.x + dOffX, y: ed.y + dOffY };
  const dimMx = (ds.x + de.x) / 2;
  const dimMy = (ds.y + de.y) / 2;

  ctx.fillStyle = dimSettings.dimensionLineColor;
  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const dimLabel = formatLength(dimLen, dimSettings.units);
  const textW = ctx.measureText(dimLabel).width;

  const ux2 = dx / len, uy2 = dy / len;
  const halfGap = textW / 2 + 4;
  ctx.strokeStyle = dimSettings.dimensionLineColor;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(ds.x, ds.y);
  ctx.lineTo(dimMx - ux2 * halfGap, dimMy - uy2 * halfGap);
  ctx.moveTo(dimMx + ux2 * halfGap, dimMy + uy2 * halfGap);
  ctx.lineTo(de.x, de.y);
  ctx.stroke();

  const tickSize = Math.max(4, 5 * zoom);
  ctx.strokeStyle = dimSettings.dimensionLineColor;
  ctx.lineWidth = 1;
  for (const pt of [ds, de]) {
    ctx.beginPath();
    ctx.moveTo(pt.x - (ux2 + nnx * dimSide) * tickSize, pt.y - (uy2 + nny * dimSide) * tickSize);
    ctx.lineTo(pt.x + (ux2 + nnx * dimSide) * tickSize, pt.y + (uy2 + nny * dimSide) * tickSize);
    ctx.stroke();
  }

  ctx.fillStyle = dimSettings.dimensionLineColor;
  ctx.fillText(dimLabel, dimMx, dimMy);

  if (selected) {
    const handleSize = 5;
    for (const pt of [s, e]) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, handleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const midX = (s.x + e.x) / 2;
    const midY = (s.y + e.y) / 2;
    const sz = 5;
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(midX - sz, midY - sz, sz * 2, sz * 2);
    ctx.strokeRect(midX - sz, midY - sz, sz * 2, sz * 2);
    const perpX = -(dy / len) * 12;
    const perpY = (dx / len) * 12;
    ctx.strokeStyle = '#3b82f680';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX - perpX, midY - perpY);
    ctx.lineTo(midX + perpX, midY + perpY);
    ctx.stroke();
    const arrowSz = 3;
    for (const sign of [1, -1]) {
      const ax = midX + perpX * sign;
      const ay = midY + perpY * sign;
      const adx = perpX / 12 * arrowSz * sign;
      const ady = perpY / 12 * arrowSz * sign;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - adx + ady * 0.5, ay - ady - adx * 0.5);
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - adx - ady * 0.5, ay - ady + adx * 0.5);
      ctx.stroke();
    }
  }
}
