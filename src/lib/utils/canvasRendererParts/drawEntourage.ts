/**
 * Entourage symbols and floor-below ghost.
 */
import type { Point, Floor, Wall, EntourageItem, CustomEntourageDef } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { getEntourageDef } from '$lib/utils/entourageCatalog';
import { wallThicknessScreen, wts } from './geometry';

// ── Entourage drawing (2D presentation symbols) ─────────────────────
const entouragePathCache = new Map<string, Path2D[]>();
function getEntouragePaths(defId: string): Path2D[] | null {
  let cached = entouragePathCache.get(defId);
  if (cached) return cached;
  const def = getEntourageDef(defId);
  if (!def) return null;
  cached = def.paths.map((d) => new Path2D(d));
  entouragePathCache.set(defId, cached);
  return cached;
}
const entourageImageCache = new Map<string, HTMLImageElement>();
function getEntourageImage(def: CustomEntourageDef, onLoad?: () => void): HTMLImageElement {
  let img = entourageImageCache.get(def.id);
  if (!img) {
    img = new Image();
    img.onload = () => onLoad?.();
    img.src = def.dataUrl;
    entourageImageCache.set(def.id, img);
  }
  return img;
}
/** height/width aspect for a built-in or custom entourage def */
export function entourageAspect(defId: string, customDefs?: CustomEntourageDef[]): number {
  return getEntourageDef(defId)?.aspect ?? customDefs?.find((c) => c.id === defId)?.aspect ?? 1;
}
export function drawEntourageItem(
  cs: CanvasState,
  item: EntourageItem,
  customDefs: CustomEntourageDef[] | undefined,
  selected: boolean,
  onImageLoad?: () => void,
): void {
  const { ctx, zoom } = cs;
  const s = wts(cs, item.position.x, item.position.y);
  const def = getEntourageDef(item.defId);
  const custom = def ? undefined : customDefs?.find((c) => c.id === item.defId);
  if (!def && !custom) return;
  const aspect = def?.aspect ?? custom!.aspect;
  const wPx = item.width * zoom;
  const hPx = wPx * aspect;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
  ctx.globalAlpha = item.opacity ?? 1;
  if (def) {
    const scale = wPx / 100;
    if (scale > 0.01) {
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(-50, -50 * aspect);
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = Math.min(1.6 / scale, 4);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const path of getEntouragePaths(item.defId) ?? []) ctx.stroke(path);
      ctx.restore();
    }
  } else if (custom) {
    const img = getEntourageImage(custom, onImageLoad);
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -wPx / 2, -hPx / 2, wPx, hPx);
    } else {
      ctx.strokeStyle = '#cbd5e1';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(-wPx / 2, -hPx / 2, wPx, hPx);
      ctx.setLineDash([]);
    }
  }
  ctx.globalAlpha = 1;
  if (selected) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(-wPx / 2 - 4, -hPx / 2 - 4, wPx + 8, hPx + 8);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.rect(wPx / 2 - 1, hPx / 2 - 1, 8, 8);
    ctx.fill();
    ctx.stroke();
    if (item.locked) {
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', 0, -hPx / 2 - 10);
    }
  }
  ctx.restore();
}
export function drawEntourageItems(
  cs: CanvasState,
  floor: Floor,
  selectedId: string | null,
  customDefs?: CustomEntourageDef[],
  onImageLoad?: () => void,
): void {
  if (!floor.entourage) return;
  for (const item of floor.entourage) {
    drawEntourageItem(cs, item, customDefs, item.id === selectedId, onImageLoad);
  }
}
export function drawEntourageGhost(
  cs: CanvasState,
  defId: string,
  customDefs: CustomEntourageDef[] | undefined,
  pos: Point,
  width: number,
): void {
  const { ctx } = cs;
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawEntourageItem(
    cs,
    { id: '__ghost__', defId, position: pos, width, rotation: 0 },
    customDefs,
    false,
  );
  ctx.restore();
}
// ── Floor-below ghost ────────────────────────────────────────────────
/** Envelope walls of the floor below; everything else there is a partition. */
const GHOST_OUTER_FILL = 'rgba(100, 116, 139, 0.30)';
const GHOST_INNER_FILL = 'rgba(100, 116, 139, 0.14)';
const GHOST_STAIR_STROKE = 'rgba(100, 116, 139, 0.55)';
/** Screen-space outline of a wall's footprint band, following its curve if it has one. */
function wallBandPath(cs: CanvasState, w: Wall): { x: number; y: number }[] {
  const s = wts(cs, w.start.x, w.start.y);
  const e = wts(cs, w.end.x, w.end.y);
  const half = wallThicknessScreen(w, cs.zoom) / 2;
  if (w.curvePoint) {
    const cp = wts(cs, w.curvePoint.x, w.curvePoint.y);
    const SEGS = 24;
    const outer: { x: number; y: number }[] = [];
    const inner: { x: number; y: number }[] = [];
    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const mt = 1 - t;
      const px = mt * mt * s.x + 2 * mt * t * cp.x + t * t * e.x;
      const py = mt * mt * s.y + 2 * mt * t * cp.y + t * t * e.y;
      const tdx = 2 * mt * (cp.x - s.x) + 2 * t * (e.x - cp.x);
      const tdy = 2 * mt * (cp.y - s.y) + 2 * t * (e.y - cp.y);
      const tlen = Math.hypot(tdx, tdy) || 1;
      const nx = (-tdy / tlen) * half;
      const ny = (tdx / tlen) * half;
      outer.push({ x: px + nx, y: py + ny });
      inner.push({ x: px - nx, y: py - ny });
    }
    return [...outer, ...inner.reverse()];
  }
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * half;
  const ny = (dx / len) * half;
  return [
    { x: s.x + nx, y: s.y + ny },
    { x: e.x + nx, y: e.y + ny },
    { x: e.x - nx, y: e.y - ny },
    { x: s.x - nx, y: s.y - ny },
  ];
}
function tracePolygon(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}
/**
 * Draw the storey below as a dim, non-interactive reference layer.
 *
 * Sits above this floor's room fills (which are opaque) but below its walls, so
 * the layout underneath shows through without competing with what you are
 * editing. Envelope walls are drawn a shade stronger than partitions — when you
 * are laying out an upper storey, the footprint you have to stay inside matters
 * more than which rooms happen to sit under it. Stairs come along because an
 * upper floor's stairwell opening has to land on the flight below.
 *
 * `outerWallIds` is passed in rather than derived here: envelope detection runs
 * room detection, which is far too costly to repeat on every animation frame.
 */
export function drawFloorBelowGhost(cs: CanvasState, floor: Floor, outerWallIds: Set<string>): void {
  const { ctx, zoom } = cs;
  ctx.save();
  for (const w of floor.walls) {
    ctx.fillStyle = outerWallIds.has(w.id) ? GHOST_OUTER_FILL : GHOST_INNER_FILL;
    tracePolygon(ctx, wallBandPath(cs, w));
    ctx.fill();
  }
  for (const stair of floor.stairs ?? []) {
    const s = wts(cs, stair.position.x, stair.position.y);
    const w = stair.width * zoom;
    const d = stair.depth * zoom;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate((stair.rotation * Math.PI) / 180);
    ctx.strokeStyle = GHOST_STAIR_STROKE;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(-w / 2, -d / 2, w, d);
    ctx.setLineDash([]);
    const treads = 4;
    ctx.beginPath();
    for (let i = 1; i < treads; i++) {
      const y = -d / 2 + (d * i) / treads;
      ctx.moveTo(-w / 2, y);
      ctx.lineTo(w / 2, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
