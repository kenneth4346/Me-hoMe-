/**
 * Canvas rendering functions for the floor plan editor.
 * All functions are pure — they take canvas context + data and render.
 * Extracted from FloorPlanCanvas.svelte.
 *
 * Implementation is split across canvasRendererParts/* so GitHub MCP
 * create_or_update_file / push_files stay under the ~25KB content limit.
 */
import { wallLength } from '$lib/utils/wallEditing';
export { wallLength };

export {
  wallPointAt,
  wallTangentAt,
  wallEdgeInsets,
  drawGrid,
  drawWall,
} from './canvasRendererParts/geometry';

export {
  drawDoorOnWall,
  drawWindowOnWall,
  drawDoorDistanceDimensions,
  drawWindowDistanceDimensions,
} from './canvasRendererParts/drawBasic';

export {
  drawGuides,
  drawPersistedMeasurements,
  drawTextAnnotations,
  drawAnnotation,
  drawAnnotations,
  getRoomFill,
  drawRoomFloorPattern,
  drawRooms,
  drawWallJoints,
  drawSnapPoints,
  drawMinimap,
} from './canvasRendererParts/drawRooms';

export {
  drawFurnitureItem,
  drawStair,
  drawColumn,
  entourageAspect,
  drawEntourageItem,
  drawEntourageItems,
  drawEntourageGhost,
  drawFloorBelowGhost,
} from './canvasRendererParts/drawExtra';
