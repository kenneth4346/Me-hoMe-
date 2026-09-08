/** TEMP stub — replace with /workspace/task003/canvasRenderer.READY_TO_PUSH.ts body (minus export { wallLength }). */
import type { Point, Wall, Door, Window as Win, FurnitureItem, Stair, Column, Floor, Annotation, Room } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import type { CustomEntourageDef, EntourageItem } from '$lib/models/types';

const missing = (name: string): never => { throw new Error(`canvasRendererImpl.${name} not loaded — push READY_TO_PUSH canvasRenderer`); };

export function wallPointAt(..._args: any[]): any { return missing('wallPointAt'); }
export function wallTangentAt(..._args: any[]): any { return missing('wallTangentAt'); }
export function wallEdgeInsets(..._args: any[]): any { return missing('wallEdgeInsets'); }
export function drawGrid(..._args: any[]): any { return missing('drawGrid'); }
export function drawWall(..._args: any[]): any { return missing('drawWall'); }
export function drawDoorOnWall(..._args: any[]): any { return missing('drawDoorOnWall'); }
export function drawWindowOnWall(..._args: any[]): any { return missing('drawWindowOnWall'); }
export function drawDoorDistanceDimensions(..._args: any[]): any { return missing('drawDoorDistanceDimensions'); }
export function drawWindowDistanceDimensions(..._args: any[]): any { return missing('drawWindowDistanceDimensions'); }
export function drawFurnitureItem(..._args: any[]): any { return missing('drawFurnitureItem'); }
export function drawStair(..._args: any[]): any { return missing('drawStair'); }
export function drawColumn(..._args: any[]): any { return missing('drawColumn'); }
export function drawGuides(..._args: any[]): any { return missing('drawGuides'); }
export function drawPersistedMeasurements(..._args: any[]): any { return missing('drawPersistedMeasurements'); }
export function drawTextAnnotations(..._args: any[]): any { return missing('drawTextAnnotations'); }
export function drawAnnotation(..._args: any[]): any { return missing('drawAnnotation'); }
export function drawAnnotations(..._args: any[]): any { return missing('drawAnnotations'); }
export function getRoomFill(..._args: any[]): any { return missing('getRoomFill'); }
export function drawRoomFloorPattern(..._args: any[]): any { return missing('drawRoomFloorPattern'); }
export function drawRooms(..._args: any[]): any { return missing('drawRooms'); }
export function drawWallJoints(..._args: any[]): any { return missing('drawWallJoints'); }
export function drawSnapPoints(..._args: any[]): any { return missing('drawSnapPoints'); }
export function drawMinimap(..._args: any[]): any { return missing('drawMinimap'); }
export function entourageAspect(..._args: any[]): any { return missing('entourageAspect'); }
export function drawEntourageItem(..._args: any[]): any { return missing('drawEntourageItem'); }
export function drawEntourageItems(..._args: any[]): any { return missing('drawEntourageItems'); }
export function drawEntourageGhost(..._args: any[]): any { return missing('drawEntourageGhost'); }
export function drawFloorBelowGhost(..._args: any[]): any { return missing('drawFloorBelowGhost'); }
