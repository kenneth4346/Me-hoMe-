/**
 * Furniture, stairs, columns, entourage, and floor-below ghost.
 * Split from canvasRenderer for GitHub MCP size limits.
 */
export { drawFurnitureItem, drawStair, drawColumn } from './drawFurniture';
export {
  entourageAspect,
  drawEntourageItem,
  drawEntourageItems,
  drawEntourageGhost,
  drawFloorBelowGhost,
} from './drawEntourage';
