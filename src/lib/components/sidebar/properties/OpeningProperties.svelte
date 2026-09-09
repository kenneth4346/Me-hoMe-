<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activeFloor, selectedElementId, updateDoor, updateWindow } from '$lib/stores/project';
  import { wallLength as calcWallLength } from '$lib/utils/wallEditing';
  import { projectSettings } from '$lib/stores/settings';
  import type { Floor, Door, Window as Win } from '$lib/models/types';

  let floor = $state<Floor | null>(null);
  let selId: string | null = $state(null);
  onDestroy(activeFloor.subscribe((f) => { floor = f; }));
  onDestroy(selectedElementId.subscribe((id) => { selId = id; }));
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
  let selectedDoor = $derived(floor?.doors?.find(d => d.id === selId) ?? null);
  let selectedWindow = $derived(floor?.windows?.find(w => w.id === selId) ?? null);
  let selectedDoorWall = $derived((selectedDoor && floor?.walls?.find(w => w.id === selectedDoor.wallId)) ?? null);
  let selectedWindowWall = $derived((selectedWindow && floor?.walls?.find(w => w.id === selectedWindow.wallId)) ?? null);
  let doorDistFromA = $derived(selectedDoor && selectedDoorWall ? calcWallLength(selectedDoorWall) * selectedDoor.position : 0);
  let doorDistFromB = $derived(selectedDoor && selectedDoorWall ? calcWallLength(selectedDoorWall) * (1 - selectedDoor.position) : 0);
  let windowDistFromA = $derived(selectedWindow && selectedWindowWall ? calcWallLength(selectedWindowWall) * selectedWindow.position : 0);
  let windowDistFromB = $derived(selectedWindow && selectedWindowWall ? calcWallLength(selectedWindowWall) * (1 - selectedWindow.position) : 0);

  function dimensionInput(e: Event, current: number, save: (cm: number) => void, zeroAllowed = false, max = Infinity) {
    const input = e.target as HTMLInputElement;
    const value = inputToCm(input.valueAsNumber);
    const valid = input.value.trim() && input.validity.valid && Number.isFinite(value) && (zeroAllowed ? value >= 0 : value > 0) && value <= max;
    if (valid && input.valueAsNumber !== displayValue(current)) save(value);
    else if (!valid && e.type === 'blur') input.value = String(displayValue(current));
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
</script>

{#if selectedDoor}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-amber-100 rounded flex items-center justify-center text-xs">🚪</span>
      Door Properties
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">Width ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedDoor.width)} oninput={onDoorWidth} onblur={onDoorWidth} step="any" min="0" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Distance from A ({unitLabel()})</span>
        <input type="number" value={displayValue(doorDistFromA)} oninput={onDoorDistFromA} onblur={onDoorDistFromA} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Distance from B ({unitLabel()})</span>
        <input type="number" value={displayValue(doorDistFromB)} oninput={onDoorDistFromB} onblur={onDoorDistFromB} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Height ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedDoor.height ?? 210)} oninput={onDoorHeight} onblur={onDoorHeight} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Type</span>
        <select value={selectedDoor.type} onchange={onDoorType} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="single">Single</option>
          <option value="double">Double</option>
          <option value="sliding">Sliding</option>
          <option value="french">French</option>
          <option value="pocket">Pocket</option>
          <option value="bifold">Bifold</option>
          <option value="opening">Doorway (no door)</option>
          <option value="garage">Garage</option>
        </select>
      </label>
      {#if selectedDoor.type !== 'opening' && selectedDoor.type !== 'garage'}
      <label class="block">
        <span class="text-xs text-gray-500">Hinge Side</span>
        <div class="flex gap-2">
          <button onclick={() => { if (selectedDoor) updateDoor(selectedDoor.id, { swingDirection: 'left' }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedDoor?.swingDirection === 'left' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">Left</button>
          <button onclick={() => { if (selectedDoor) updateDoor(selectedDoor.id, { swingDirection: 'right' }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedDoor?.swingDirection === 'right' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">Right</button>
        </div>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Opens</span>
        <div class="flex gap-2">
          <button onclick={() => { if (selectedDoor) updateDoor(selectedDoor.id, { flipSide: false }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {!(selectedDoor?.flipSide) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">Inward</button>
          <button onclick={() => { if (selectedDoor) updateDoor(selectedDoor.id, { flipSide: true }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedDoor?.flipSide ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">Outward</button>
        </div>
      </label>
      {/if}
    </div>
{:else if selectedWindow}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-cyan-100 rounded flex items-center justify-center text-xs">🪟</span>
      Window Properties
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">Type</span>
        <select value={selectedWindow.type ?? 'standard'} onchange={onWindowType} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="standard">Standard</option>
          <option value="fixed">Fixed</option>
          <option value="casement">Casement</option>
          <option value="sliding">Sliding</option>
          <option value="bay">Bay</option>
        </select>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Width ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedWindow.width)} oninput={onWindowWidth} onblur={onWindowWidth} step="any" min="0" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Distance from A ({unitLabel()})</span>
        <input type="number" value={displayValue(windowDistFromA)} oninput={onWindowDistFromA} onblur={onWindowDistFromA} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Distance from B ({unitLabel()})</span>
        <input type="number" value={displayValue(windowDistFromB)} oninput={onWindowDistFromB} onblur={onWindowDistFromB} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Height ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedWindow.height)} oninput={onWindowHeight} onblur={onWindowHeight} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Sill Height ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedWindow.sillHeight)} oninput={onWindowSill} onblur={onWindowSill} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
    </div>
{/if}
