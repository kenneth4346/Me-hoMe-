/**
 * Canvas rendering functions for the floor plan editor.
 * All functions are pure — they take canvas context + data and render.
 * Extracted from FloorPlanCanvas.svelte.
 */
import type { Point, Wall, Door, Window as Win, FurnitureItem, Stair, Column, Floor, Annotation } from '$lib/models/types';
import type { Room } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength, formatArea } from '$lib/stores/settings';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { drawFurnitureIcon } from '$lib/utils/furnitureIcons';
import { getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { getWallTextureCanvas, getFloorTextureCanvas } from '$lib/utils/textureGenerator';
import { getEntourageDef } from '$lib/utils/entourageCatalog';
import type { EntourageItem, CustomEntourageDef } from '$lib/models/types';
import { wallLength } from '$lib/utils/wallEditing';
export { wallLength };

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

function wallThicknessScreen(w: Wall, zoom: number): number {
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

export function drawGrid(..._args: any[]): any {
  throw new Error('canvasRenderer.drawGrid: incomplete MCP push');
}

export function drawWall(..._args: any[]): any {
  throw new Error('canvasRenderer.drawWall: incomplete MCP push');
}

export function drawDoorOnWall(..._args: any[]): any {
  throw new Error('canvasRenderer.drawDoorOnWall: incomplete MCP push');
}

export function drawWindowOnWall(..._args: any[]): any {
  throw new Error('canvasRenderer.drawWindowOnWall: incomplete MCP push');
}

export function drawDoorDistanceDimensions(..._args: any[]): any {
  throw new Error('canvasRenderer.drawDoorDistanceDimensions: incomplete MCP push');
}

export function drawWindowDistanceDimensions(..._args: any[]): any {
  throw new Error('canvasRenderer.drawWindowDistanceDimensions: incomplete MCP push');
}

export function drawFurnitureItem(..._args: any[]): any {
  throw new Error('canvasRenderer.drawFurnitureItem: incomplete MCP push');
}

export function drawStair(..._args: any[]): any {
  throw new Error('canvasRenderer.drawStair: incomplete MCP push');
}

export function drawColumn(..._args: any[]): any {
  throw new Error('canvasRenderer.drawColumn: incomplete MCP push');
}

export function drawGuides(..._args: any[]): any {
  throw new Error('canvasRenderer.drawGuides: incomplete MCP push');
}

export function drawPersistedMeasurements(..._args: any[]): any {
  throw new Error('canvasRenderer.drawPersistedMeasurements: incomplete MCP push');
}

export function drawTextAnnotations(..._args: any[]): any {
  throw new Error('canvasRenderer.drawTextAnnotations: incomplete MCP push');
}

export function drawAnnotation(..._args: any[]): any {
  throw new Error('canvasRenderer.drawAnnotation: incomplete MCP push');
}

export function drawAnnotations(..._args: any[]): any {
  throw new Error('canvasRenderer.drawAnnotations: incomplete MCP push');
}

export function getRoomFill(..._args: any[]): any {
  throw new Error('canvasRenderer.getRoomFill: incomplete MCP push');
}

export function drawRoomFloorPattern(..._args: any[]): any {
  throw new Error('canvasRenderer.drawRoomFloorPattern: incomplete MCP push');
}

export function drawRooms(..._args: any[]): any {
  throw new Error('canvasRenderer.drawRooms: incomplete MCP push');
}

export function drawWallJoints(..._args: any[]): any {
  throw new Error('canvasRenderer.drawWallJoints: incomplete MCP push');
}

export function drawSnapPoints(..._args: any[]): any {
  throw new Error('canvasRenderer.drawSnapPoints: incomplete MCP push');
}

export function drawMinimap(..._args: any[]): any {
  throw new Error('canvasRenderer.drawMinimap: incomplete MCP push');
}

export function entourageAspect(..._args: any[]): any {
  throw new Error('canvasRenderer.entourageAspect: incomplete MCP push');
}

export function drawEntourageItem(..._args: any[]): any {
  throw new Error('canvasRenderer.drawEntourageItem: incomplete MCP push');
}

export function drawEntourageItems(..._args: any[]): any {
  throw new Error('canvasRenderer.drawEntourageItems: incomplete MCP push');
}

export function drawEntourageGhost(..._args: any[]): any {
  throw new Error('canvasRenderer.drawEntourageGhost: incomplete MCP push');
}

export function drawFloorBelowGhost(..._args: any[]): any {
  throw new Error('canvasRenderer.drawFloorBelowGhost: incomplete MCP push');
}
