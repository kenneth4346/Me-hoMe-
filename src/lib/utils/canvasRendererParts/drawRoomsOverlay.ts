/**
 * Rooms overlay, joints, snap points, minimap.
 */
import type { Floor, Room, Wall } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength, formatArea } from '$lib/stores/settings';
import { getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { wts } from './geometry';
import { getRoomFill, drawRoomFloorPattern } from './drawRoomFills';

export function drawRooms(
  cs: CanvasState,
  floor: Floor,
  detectedRooms: Room[],
  currentSelectedRoomId: string | null,
  showRoomLabels: boolean,
  showDimensions: boolean,
  dimSettings: ProjectSettings,
): void {
  const { ctx, zoom } = cs;
  for (let ri = 0; ri < detectedRooms.length; ri++) {
    const room = detectedRooms[ri];
    const poly = getRoomPolygon(room, floor.walls);
    if (poly.length < 3) continue;
    const screenPoly = poly.map(p => wts(cs, p.x, p.y));
    ctx.fillStyle = getRoomFill(room, ri);
    ctx.beginPath();
    ctx.moveTo(screenPoly[0].x, screenPoly[0].y);
    for (let i = 1; i < screenPoly.length; i++) ctx.lineTo(screenPoly[i].x, screenPoly[i].y);
    ctx.closePath(); ctx.fill();

    drawRoomFloorPattern(cs, room, screenPoly);

    const isSelected = currentSelectedRoomId === room.id;
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    const centroid = roomCentroid(poly);
    const sc = wts(cs, centroid.x, centroid.y);
    const fontSize = Math.max(11, 13 * zoom);
    if (showRoomLabels) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${room.name} (${formatArea(room.area, dimSettings.units)})`, sc.x, sc.y);
    }

    if (showDimensions && dimSettings.showInternalDimensions && poly.length >= 3) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of poly) { if (pt.x < minX) minX = pt.x; if (pt.x > maxX) maxX = pt.x; if (pt.y < minY) minY = pt.y; if (pt.y > maxY) maxY = pt.y; }
      const roomW = (maxX - minX) / 100;
      const roomD = (maxY - minY) / 100;
      if (roomW > 0.1 && roomD > 0.1) {
        const dimFontSize = Math.max(9, 10 * zoom);
        ctx.fillStyle = '#b0b8c4'; ctx.font = `${dimFontSize}px sans-serif`;
        ctx.fillText(`${formatLength(roomW * 100, dimSettings.units)} × ${formatLength(roomD * 100, dimSettings.units)}`, sc.x, sc.y + fontSize + 2);
      }
    }
  }
}

// ── Wall joints ──────────────────────────────────────────────────────

export function drawWallJoints(cs: CanvasState, floor: Floor, selId: string | null): void {
  const { ctx, zoom } = cs;
  const epMap = new Map<string, { x: number; y: number; thickness: number; selected: boolean }[]>();
  for (const w of floor.walls) {
    const sel = w.id === selId;
    for (const ep of [w.start, w.end]) {
      const key = `${Math.round(ep.x)},${Math.round(ep.y)}`;
      if (!epMap.has(key)) epMap.set(key, []);
      epMap.get(key)!.push({ x: ep.x, y: ep.y, thickness: w.thickness, selected: sel });
    }
  }
  for (const [, entries] of epMap) {
    if (entries.length < 2) continue;
    const anySelected = entries.some(e => e.selected);
    const maxThickness = Math.max(...entries.map(e => e.thickness));
    const s = wts(cs, entries[0].x, entries[0].y);
    const r = Math.max(maxThickness * zoom, 4) / 2 + 0.5;
    ctx.fillStyle = anySelected ? '#93c5fd' : '#404040';
    ctx.strokeStyle = anySelected ? '#3b82f6' : '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

// ── Snap points ──────────────────────────────────────────────────────

export function drawSnapPoints(cs: CanvasState, floor: Floor, showGrid: boolean): void {
  if (!showGrid) return;
  const { ctx } = cs;
  ctx.fillStyle = '#3b82f640';
  const seen = new Set<string>();
  for (const w of floor.walls) {
    for (const ep of [w.start, w.end]) {
      const key = `${ep.x},${ep.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const s = wts(cs, ep.x, ep.y);
      ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ── Minimap ──────────────────────────────────────────────────────────

export function drawMinimap(
  cs: CanvasState,
  minimapCanvas: HTMLCanvasElement,
  floor: Floor,
  getWorldBBox: () => { minX: number; minY: number; maxX: number; maxY: number } | null,
): void {
  const mctx = minimapCanvas.getContext('2d');
  if (!mctx) return;
  const mw = minimapCanvas.width;
  const mh = minimapCanvas.height;
  mctx.clearRect(0, 0, mw, mh);

  const bbox = getWorldBBox();
  if (!bbox) return;

  mctx.fillStyle = '#f0f1f3'; mctx.fillRect(0, 0, mw, mh);

  const bw = bbox.maxX - bbox.minX;
  const bh = bbox.maxY - bbox.minY;
  if (bw < 1 || bh < 1) return;
  const scale = Math.min((mw - 8) / bw, (mh - 8) / bh);
  const ox = (mw - bw * scale) / 2;
  const oy = (mh - bh * scale) / 2;

  function toMini(wx: number, wy: number) {
    return { x: ox + (wx - bbox!.minX) * scale, y: oy + (wy - bbox!.minY) * scale };
  }

  mctx.strokeStyle = '#555';
  mctx.lineWidth = Math.max(1, 2 * scale);
  for (const w of floor.walls) {
    const s = toMini(w.start.x, w.start.y);
    const e = toMini(w.end.x, w.end.y);
    mctx.beginPath();
    if (w.curvePoint) {
      const cp = toMini(w.curvePoint.x, w.curvePoint.y);
      mctx.moveTo(s.x, s.y); mctx.quadraticCurveTo(cp.x, cp.y, e.x, e.y);
    } else {
      mctx.moveTo(s.x, s.y); mctx.lineTo(e.x, e.y);
    }
    mctx.stroke();
  }

  for (const fi of floor.furniture) {
    const cat = getCatalogItem(fi.catalogId);
    if (!cat) continue;
    const p = toMini(fi.position.x, fi.position.y);
    const fw = Math.max(2, (fi.width ?? cat.width) * scale);
    const fd = Math.max(2, (fi.depth ?? cat.depth) * scale);
    mctx.fillStyle = (fi.color ?? cat.color) + 'aa';
    mctx.save();
    mctx.translate(p.x, p.y);
    mctx.rotate((fi.rotation * Math.PI) / 180);
    mctx.fillRect(-fw / 2, -fd / 2, fw, fd);
    mctx.restore();
  }

  const { width, height, zoom, camX, camY } = cs;
  const vpTL = { x: (0 - width / 2) / zoom + camX, y: (0 - height / 2) / zoom + camY };
  const vpBR = { x: (width - width / 2) / zoom + camX, y: (height - height / 2) / zoom + camY };
  const vtl = toMini(vpTL.x, vpTL.y);
  const vbr = toMini(vpBR.x, vpBR.y);
  mctx.strokeStyle = '#3b82f6'; mctx.lineWidth = 1.5;
  mctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
  const vw = vbr.x - vtl.x;
  const vh = vbr.y - vtl.y;
  mctx.fillRect(vtl.x, vtl.y, vw, vh);
  mctx.strokeRect(vtl.x, vtl.y, vw, vh);

  mctx.strokeStyle = '#cbd5e1'; mctx.lineWidth = 1; mctx.strokeRect(0, 0, mw, mh);
}
