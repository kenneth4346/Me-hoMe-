<script lang="ts">
  import { furnitureFinishes } from '$lib/utils/furnitureFinishes';
  import { onDestroy } from 'svelte';
  import ItemDetailsPanel from './ItemDetailsPanel.svelte';
  import type { DetailTarget } from '$lib/models/types';
  import { catalogAssetUrl } from '$lib/utils/catalogAssetUrl';

  import { activeFloor, selectedElementId, selectedRoomId, updateWall, resizeWallLength, reverseWall, updateDoor, updateWindow, updateRoom, updateFurniture, detectedRoomsStore, updateStair, updateColumn, updateBackgroundImage, setBackgroundImage, calibrationMode, calibrationPoints, updateTextAnnotation, toggleFurnitureLock, updateEntourageItem, removeElement, elevationWallId } from '$lib/stores/project';
  import { wallLength as calcWallLength, wallAngle, wallLengthDisplayValue, wallLengthInputToCm, wallLengthUnitLabel, MIN_WALL_LENGTH, type WallEndpoint } from '$lib/utils/wallEditing';
  import { openingOnWall } from '$lib/utils/wallProfiles';
  import { getEntourageDef } from '$lib/utils/entourageCatalog';
  import { floorMaterials, wallColors } from '$lib/utils/materials';
  import { getCatalogItem } from '$lib/utils/furnitureCatalog';
  import { projectSettings, formatLength, formatArea } from '$lib/stores/settings';
    import type { Floor, Wall, Door, Window as Win, Room, FurnitureItem, Stair, Column, RoomCategory, TextAnnotation } from '$lib/models/types';
  import { getWallStartHeight, getWallEndHeight } from '$lib/models/types';

  let floor = $state<Floor | null>(null);
  let selId: string | null = $state(null);
  let selRoomId: string | null = $state(null);
  let detectedRooms: Room[] = $state([]);

  onDestroy(activeFloor.subscribe((f) => { floor = f; }));
  onDestroy(selectedElementId.subscribe((id) => { selId = id; }));
  onDestroy(selectedRoomId.subscribe((id) => { selRoomId = id; }));
  onDestroy(detectedRoomsStore.subscribe((rooms) => { detectedRooms = rooms; }));

  let settings = $state($projectSettings);
  onDestroy(projectSettings.subscribe((s) => { settings = s; }));

  function displayValue(cm: number): number {
    return settings.units === 'imperial' ? Math.round(cm / 2.54 * 10) / 10 : Math.round(cm * 1000) / 1000;
  }
  function inputToCm(value: number): number {
    return settings.units === 'imperial' ? value * 2.54 : value;
  }
  function unitLabel(): string {
    return settings.units === 'imperial' ? 'in' : 'cm';
  }

  let { is3D = false }: { is3D?: boolean } = $props();
  let wallSideTab = $state<'interior' | 'exterior'>('interior');
  let selectedWall = $derived(floor?.walls?.find(w => w.id === selId) ?? null);
  let selectedDoor = $derived(floor?.doors?.find(d => d.id === selId) ?? null);
  let selectedWindow = $derived(floor?.windows?.find(w => w.id === selId) ?? null);
  let selectedFurniture = $derived(floor?.furniture?.find(f => f.id === selId) ?? null);
  let selectedStair = $derived(floor?.stairs?.find(s => s.id === selId) ?? null);
  let selectedColumn = $derived(floor?.columns?.find(c => c.id === selId) ?? null);
  let selectedTextAnnotation = $derived(floor?.textAnnotations?.find(t => t.id === selId) ?? null);
  let selectedEntourage = $derived(floor?.entourage?.find(en => en.id === selId) ?? null);
  let hasBgImage = $derived(!!floor?.backgroundImage);
  let selectedRoom = $derived(floor?.rooms?.find(r => r.id === selRoomId) ?? detectedRooms.find(r => r.id === selRoomId) ?? null);

  let selectedDoorWall = $derived((selectedDoor && floor?.walls?.find(w => w.id === selectedDoor.wallId)) ?? null);
  let selectedWindowWall = $derived((selectedWindow && floor?.walls?.find(w => w.id === selectedWindow.wallId)) ?? null);

  let wallLength = $derived(selectedWall ? Math.round(calcWallLength(selectedWall) * 1000) / 1000 : 0);
  let fixedEndpoint = $state<WallEndpoint>('start');
  let wallLengthError = $state<string | null>(null);
  $effect(() => { void selId; fixedEndpoint = 'start'; wallLengthError = null; });

  let doorDistFromA = $derived(selectedDoor && selectedDoorWall ? calcWallLength(selectedDoorWall) * selectedDoor.position : 0);
  let doorDistFromB = $derived(selectedDoor && selectedDoorWall ? calcWallLength(selectedDoorWall) * (1 - selectedDoor.position) : 0);

  let windowDistFromA = $derived(selectedWindow && selectedWindowWall ? calcWallLength(selectedWindowWall) * selectedWindow.position : 0);
  let windowDistFromB = $derived(selectedWindow && selectedWindowWall ? calcWallLength(selectedWindowWall) * (1 - selectedWindow.position) : 0);

  function onWallLength(e: Event) {
    if (!selectedWall) return;
    const input = e.target as HTMLInputElement;
    const current = calcWallLength(selectedWall);
    const shown = wallLengthDisplayValue(current, settings.units);
    if (!input.value.trim() || !input.validity.valid || !Number.isFinite(input.valueAsNumber)) {
      wallLengthError = settings.units === 'imperial'
        ? 'Enter a wall length of at least 1 cm.'
        : 'Enter a wall length of at least 10 mm.';
    } else if (input.valueAsNumber !== shown) {
      wallLengthError = resizeWallLength(selectedWall.id, wallLengthInputToCm(input.valueAsNumber, settings.units), fixedEndpoint);
    } else { wallLengthError = null; }
    input.value = String(wallLengthDisplayValue(calcWallLength(selectedWall), settings.units));
  }

  let selectedWallAngle = $derived(selectedWall ? wallAngle(selectedWall) : 0);

  function dimensionInput(e: Event, current: number, save: (cm: number) => void, zeroAllowed = false, max = Infinity) {
    const input = e.target as HTMLInputElement;
    const value = inputToCm(input.valueAsNumber);
    const valid = input.value.trim() && input.validity.valid && Number.isFinite(value) && (zeroAllowed ? value >= 0 : value > 0) && value <= max;
    if (valid && input.valueAsNumber !== displayValue(current)) save(value);
    else if (!valid && e.type === 'blur') input.value = String(displayValue(current));
  }
  function onWallThickness(e: Event) {
    if (selectedWall) dimensionInput(e, selectedWall.thickness, value => updateWall(selectedWall!.id, { thickness: value }));
  }
  let clippedOpenings = $derived.by(() => {
    if (!selectedWall || !floor) return false;
    const wall = selectedWall;
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
    return [...floor.doors.filter(d => d.wallId === wall.id).map(d => ({ ...d, bottom: 0 })),
      ...floor.windows.filter(w => w.wallId === wall.id).map(w => ({ ...w, bottom: w.sillHeight ?? 90 }))].some(item => {
      const rect = openingOnWall(length, getWallStartHeight(wall), getWallEndHeight(wall), item.position, item.width, item.bottom, item.height);
      return !rect || rect.right - rect.left < item.width - 0.01 || rect.top - rect.bottom < item.height - 0.01;
    });
  });
  function onWallStartHeight(e: Event) {
    if (selectedWall) dimensionInput(e, getWallStartHeight(selectedWall), value => updateWall(selectedWall!.id, { startHeight: value }), true);
  }
  function onWallEndHeight(e: Event) {
    if (selectedWall) dimensionInput(e, getWallEndHeight(selectedWall), value => updateWall(selectedWall!.id, { endHeight: value }), true);
  }
  function equalizeWallHeights() {
    if (!selectedWall) return;
    const startH = getWallStartHeight(selectedWall);
    updateWall(selectedWall.id, { startHeight: startH, endHeight: startH, height: startH });
  }
  function onWallColor(e: Event) {
    if (!selectedWall) return;
    updateWall(selectedWall.id, { color: (e.target as HTMLInputElement).value });
  }
  function onDoorWidth(e: Event) {
    if (selectedDoor) dimensionInput(e, selectedDoor.width, value => updateDoor(selectedDoor!.id, { width: value }));
  }
  function onDoorHeight(e: Event) {
    if (selectedDoor) dimensionInput(e, selectedDoor.height ?? 210, value => updateDoor(selectedDoor!.id, { height: value }));
  }
  function onDoorType(e: Event) {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { type: (e.target as HTMLSelectElement).value as Door['type'] });
  }
  function onDoorSwing(e: Event) {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { swingDirection: (e.target as HTMLSelectElement).value as 'left' | 'right' });
  }
  function flipDoorHorizontal() {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { swingDirection: selectedDoor.swingDirection === 'left' ? 'right' : 'left' });
  }
  function flipDoorVertical() {
    if (!selectedDoor) return;
    updateDoor(selectedDoor.id, { flipSide: !(selectedDoor.flipSide ?? false) });
  }
  function onWindowType(e: Event) {
    if (!selectedWindow) return;
    updateWindow(selectedWindow.id, { type: (e.target as HTMLSelectElement).value as Win['type'] });
  }
  function onWindowWidth(e: Event) {
    if (selectedWindow) dimensionInput(e, selectedWindow.width, value => updateWindow(selectedWindow!.id, { width: value }));
  }
  function onWindowHeight(e: Event) {
    if (selectedWindow) dimensionInput(e, selectedWindow.height, value => updateWindow(selectedWindow!.id, { height: value }));
  }
  function onWindowSill(e: Event) {
    if (selectedWindow) dimensionInput(e, selectedWindow.sillHeight ?? 90, value => updateWindow(selectedWindow!.id, { sillHeight: value }), true);
  }

  function onFurnitureColor(color: string) {
    if (!selectedFurniture) return;
    updateFurniture(selectedFurniture.id, { color });
  }
  function onFurnitureWidth(e: Event) {
    if (!selectedFurniture) return;
    dimensionInput(e, selectedFurniture.width ?? getCatalogItem(selectedFurniture.catalogId)?.width ?? 100,
      value => updateFurniture(selectedFurniture!.id, { width: value }));
  }
  function onFurnitureDepth(e: Event) {
    if (!selectedFurniture) return;
    dimensionInput(e, selectedFurniture.depth ?? getCatalogItem(selectedFurniture.catalogId)?.depth ?? 80,
      value => updateFurniture(selectedFurniture!.id, { depth: value }));
  }
  function onFurnitureHeight(e: Event) {
    if (!selectedFurniture) return;
    dimensionInput(e, selectedFurniture.height ?? getCatalogItem(selectedFurniture.catalogId)?.height ?? 80,
      value => updateFurniture(selectedFurniture!.id, { height: value }));
  }
  function onFurnitureMaterial(e: Event) {
    if (!selectedFurniture) return;
    updateFurniture(selectedFurniture.id, { material: (e.target as HTMLSelectElement).value || undefined });
  }
  function onFurnitureRotation(e: Event) {
    if (!selectedFurniture) return;
    updateFurniture(selectedFurniture.id, { rotation: Number((e.target as HTMLInputElement).value) });
  }
  function resetFurnitureDefaults() {
    if (!selectedFurniture) return;
    updateFurniture(selectedFurniture.id, { color: undefined, width: undefined, depth: undefined, height: undefined, material: undefined });
  }

  function onDoorDistFromA(e: Event) {
    if (!selectedDoor || !selectedDoorWall) return;
    const length = calcWallLength(selectedDoorWall);
    if (!Number.isFinite(length) || length <= 0) return;
    dimensionInput(e, length * selectedDoor.position, value => updateDoor(selectedDoor!.id, { position: value / length }), true, length);
  }
  
  function onDoorDistFromB(e: Event) {
    if (!selectedDoor || !selectedDoorWall) return;
    const length = calcWallLength(selectedDoorWall);
    if (!Number.isFinite(length) || length <= 0) return;
    dimensionInput(e, length * (1 - selectedDoor.position), value => updateDoor(selectedDoor!.id, { position: 1 - value / length }), true, length);
  }

  function onWindowDistFromA(e: Event) {
    if (!selectedWindow || !selectedWindowWall) return;
    const length = calcWallLength(selectedWindowWall);
    if (!Number.isFinite(length) || length <= 0) return;
    dimensionInput(e, length * selectedWindow.position, value => updateWindow(selectedWindow!.id, { position: value / length }), true, length);
  }
  
  function onWindowDistFromB(e: Event) {
    if (!selectedWindow || !selectedWindowWall) return;
    const length = calcWallLength(selectedWindowWall);
    if (!Number.isFinite(length) || length <= 0) return;
    dimensionInput(e, length * (1 - selectedWindow.position), value => updateWindow(selectedWindow!.id, { position: 1 - value / length }), true, length);
  }
  let detailTarget = $derived.by((): DetailTarget | null => {
    if (!floor) return null;
    for (const [kind, item] of [['walls', selectedWall], ['doors', selectedDoor], ['windows', selectedWindow], ['furniture', selectedFurniture], ['rooms', selectedRoom]] as const) {
      if (item) return { floorId: floor.id, kind, id: item.id };
    }
    return null;
  });
  const roomColorPresets = [
    { name: 'White', color: '#ffffff' },
    { name: 'Cream', color: '#fffdd0' },
    { name: 'Beige', color: '#f5f5dc' },
    { name: 'Light Gray', color: '#d1d5db' },
    { name: 'Warm Gray', color: '#b8a082' },
    { name: 'Sage Green', color: '#d4e2d4' },
    { name: 'Light Blue', color: '#dbeafe' },
    { name: 'Blush Pink', color: '#f4c2c2' },
    { name: 'Lavender', color: '#e6e6fa' },
    { name: 'Butter Yellow', color: '#fff8dc' },
  ];

  const columnColorPresets = [
    { name: 'White', color: '#ffffff' },
    { name: 'Light Gray', color: '#d1d5db' },
    { name: 'Concrete', color: '#999999' },
    { name: 'Charcoal', color: '#374151' },
    { name: 'Black', color: '#000000' },
    { name: 'Cream', color: '#fffdd0' },
    { name: 'Wood', color: '#8B6914' },
    { name: 'Bronze', color: '#cd7f32' },
    { name: 'Silver', color: '#c0c0c0' },
    { name: 'Navy', color: '#1e3a8a' },
  ];

  function updateDetectedRoom(id: string, updates: Partial<{ name: string; floorTexture: string; color: string }>) {
    detectedRoomsStore.update(rooms => rooms.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  function onRoomName(e: Event) {
    if (!selectedRoom) return;
    const name = (e.target as HTMLInputElement).value;
    updateRoom(selectedRoom.id, { name });
    updateDetectedRoom(selectedRoom.id, { name });
  }
  function onRoomFloor(texture: string) {
    if (!selectedRoom) return;
    updateRoom(selectedRoom.id, { floorTexture: texture });
    updateDetectedRoom(selectedRoom.id, { floorTexture: texture });
  }
  function onRoomColor(color: string) {
    if (!selectedRoom) return;
    updateRoom(selectedRoom.id, { color });
    updateDetectedRoom(selectedRoom.id, { color });
  }

  const roomTypes = [
    { id: 'living', label: 'Living Room', icon: '💺' },
    { id: 'bedroom', label: 'Bedroom', icon: '🛏️' },
    { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { id: 'bathroom', label: 'Bathroom', icon: '🚿' },
    { id: 'dining', label: 'Dining Room', icon: '🍽️' },
    { id: 'office', label: 'Office', icon: '💻' },
    { id: 'hallway', label: 'Hallway', icon: '🚶' },
    { id: 'closet', label: 'Closet', icon: '👔' },
    { id: 'laundry', label: 'Laundry', icon: '🧺' },
    { id: 'garage', label: 'Garage', icon: '🚗' },
    { id: 'custom', label: 'Custom', icon: '✏️' },
  ];

  function onRoomType(e: Event) {
    if (!selectedRoom) return;
    const typeId = (e.target as HTMLSelectElement).value;
    const rt = roomTypes.find(t => t.id === typeId);
    if (rt && rt.id !== 'custom') {
      updateRoom(selectedRoom.id, { name: rt.label });
      updateDetectedRoom(selectedRoom.id, { name: rt.label });
    }
  }

  let selectedRoomType = $derived(() => {
    if (!selectedRoom) return 'custom';
    const match = roomTypes.find(t => t.label === selectedRoom!.name);
    return match ? match.id : 'custom';
  });

  const floorTexPaths: Record<string, string> = {
    'light-oak': catalogAssetUrl(`/textures/floor-light-oak.webp`), 'walnut': catalogAssetUrl(`/textures/floor-walnut.webp`),
    'bamboo': catalogAssetUrl(`/textures/floor-bamboo.webp`), 'laminate': catalogAssetUrl(`/textures/floor-laminate.webp`),
    'ceramic-white': catalogAssetUrl(`/textures/floor-tile-white.webp`), 'ceramic-gray': catalogAssetUrl(`/textures/floor-tile-gray.webp`),
    'porcelain': catalogAssetUrl(`/textures/floor-porcelain.webp`),
    'marble-white': catalogAssetUrl(`/textures/floor-marble-white.webp`), 'marble-dark': catalogAssetUrl(`/textures/floor-marble-dark.webp`),
    'carpet-beige': catalogAssetUrl(`/textures/floor-carpet-beige.webp`), 'carpet-gray': catalogAssetUrl(`/textures/floor-carpet-gray.webp`),
    'concrete': catalogAssetUrl(`/textures/floor-concrete.webp`), 'slate': catalogAssetUrl(`/textures/floor-slate.webp`),
    'vinyl': catalogAssetUrl(`/textures/floor-vinyl.webp`),
  };
  const wallTexPaths: Record<string, string> = {
    'red-brick': catalogAssetUrl(`/textures/brick.webp`), 'exposed-brick': catalogAssetUrl(`/textures/exposed-brick.webp`),
    'stone': catalogAssetUrl(`/textures/stone.webp`), 'wood-panel': catalogAssetUrl(`/textures/wood-panel.webp`),
    'concrete-block': catalogAssetUrl(`/textures/concrete.webp`), 'subway-tile': catalogAssetUrl(`/textures/subway-tile.webp`),
  };
  const textureGroups = [
    { label: '🎨 Plain', ids: ['none'] },
    { label: '🪵 Wood', ids: ['light-oak', 'walnut', 'bamboo', 'laminate'] },
    { label: '🔲 Tile', ids: ['ceramic-white', 'ceramic-gray', 'porcelain', 'vinyl'] },
    { label: '🪨 Stone', ids: ['marble-white', 'marble-dark', 'concrete', 'slate'] },
    { label: '🧶 Carpet', ids: ['carpet-beige', 'carpet-gray'] },
  ];

  let hasSelection = $derived(!!selectedWall || !!selectedDoor || !!selectedWindow || !!selectedFurniture || !!selectedRoom || !!selectedStair || !!selectedColumn || !!selectedTextAnnotation || !!selectedEntourage || (!is3D && hasBgImage));
</script>
