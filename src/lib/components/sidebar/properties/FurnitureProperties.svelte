<script lang="ts">
  import { onDestroy } from 'svelte';
  import { furnitureFinishes } from '$lib/utils/furnitureFinishes';
  import { activeFloor, selectedElementId, updateFurniture, toggleFurnitureLock } from '$lib/stores/project';
  import { getCatalogItem } from '$lib/utils/furnitureCatalog';
  import { projectSettings } from '$lib/stores/settings';
  import type { Floor } from '$lib/models/types';

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
  let selectedFurniture = $derived(floor?.furniture?.find(f => f.id === selId) ?? null);
  function dimensionInput(e: Event, current: number, save: (cm: number) => void, zeroAllowed = false, max = Infinity) {
    const input = e.target as HTMLInputElement;
    const value = inputToCm(input.valueAsNumber);
    const valid = input.value.trim() && input.validity.valid && Number.isFinite(value) && (zeroAllowed ? value >= 0 : value > 0) && value <= max;
    if (valid && input.valueAsNumber !== displayValue(current)) save(value);
    else if (!valid && e.type === 'blur') input.value = String(displayValue(current));
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
</script>

{#if selectedFurniture}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-purple-100 rounded flex items-center justify-center text-xs">
        {getCatalogItem(selectedFurniture.catalogId)?.icon ?? '🪑'}
      </span>
      {getCatalogItem(selectedFurniture.catalogId)?.name ?? 'Furniture'} Properties
      <button
        onclick={() => { if (selectedFurniture) toggleFurnitureLock(selectedFurniture.id); }}
        class="ml-auto px-1.5 py-0.5 rounded text-xs border transition-colors {selectedFurniture.locked ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}"
        title={selectedFurniture.locked ? 'Unlock (Ctrl+L)' : 'Lock (Ctrl+L)'}
      >{selectedFurniture.locked ? '🔒 Locked' : '🔓'}</button>
    </h3>
    {#if selectedFurniture.catalogId === 'imported_object'}
      <p class="mb-3 text-xs text-gray-500 break-words">Original category: {selectedFurniture.sourceCategory || 'Unknown'}. Shown as a neutral box.</p>
    {:else if selectedFurniture.catalogId === 'stairs'}
      <p class="mb-3 text-xs text-gray-500">Imported stair preview. Use building stairs to edit risers and stair layouts.</p>
    {/if}
    <div class="space-y-3">
      <!-- Color -->
      <div>
        <div class="flex items-center gap-1 mb-2">
          <span class="text-xs text-gray-500">Color</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
        </div>
        <div class="grid grid-cols-5 gap-1.5 mb-2">
          {#each ['#ffffff', '#f5f5dc', '#d2b48c', '#daa520', '#8b4513', '#696969', '#191970', '#000000', '#dc143c', '#228b22'] as color}
            <button
              class="w-6 h-6 rounded border-2 hover:border-gray-300 transition-colors {(selectedFurniture.color ?? getCatalogItem(selectedFurniture.catalogId)?.color) === color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
              style="background-color: {color}"
              title="Color: {color}"
              onclick={() => onFurnitureColor(color)}
            ></button>
          {/each}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Custom:</span>
          <input 
            type="color" 
            value={selectedFurniture.color ?? getCatalogItem(selectedFurniture.catalogId)?.color ?? '#888888'} 
            oninput={(e) => onFurnitureColor((e.target as HTMLInputElement).value)} 
            class="w-8 h-6 rounded border border-gray-200 cursor-pointer" 
          />
        </div>
      </div>
      
      <!-- Dimensions -->
      <label class="block">
        <span class="text-xs text-gray-500">Width ({unitLabel()})</span>
        <input 
          type="number" 
          value={displayValue(selectedFurniture.width ?? getCatalogItem(selectedFurniture.catalogId)?.width ?? 100)} 
          oninput={onFurnitureWidth} onblur={onFurnitureWidth} min={settings.units === 'imperial' ? 1 / 2.54 : 1} step="any"
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm" 
        />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Depth ({unitLabel()})</span>
        <input 
          type="number" 
          value={displayValue(selectedFurniture.depth ?? getCatalogItem(selectedFurniture.catalogId)?.depth ?? 80)} 
          oninput={onFurnitureDepth} onblur={onFurnitureDepth} min={settings.units === 'imperial' ? 1 / 2.54 : 1} step="any"
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm" 
        />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Height ({unitLabel()})</span>
        <input 
          type="number" 
          value={displayValue(selectedFurniture.height ?? getCatalogItem(selectedFurniture.catalogId)?.height ?? 80)} 
          oninput={onFurnitureHeight} onblur={onFurnitureHeight} min={settings.units === 'imperial' ? 1 / 2.54 : 1} step="any"
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm" 
        />
      </label>
      
      <!-- Material -->
      <label class="block">
        <span class="text-xs text-gray-500">Material</span>
        <select 
          value={selectedFurniture.material ?? ''}
          onchange={onFurnitureMaterial} 
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm"
        >
          <option value="">Original materials</option>
          {#if selectedFurniture.material && !Object.hasOwn(furnitureFinishes, selectedFurniture.material)}
            <option value={selectedFurniture.material}>{selectedFurniture.material} (retained)</option>
          {/if}
          {#each Object.keys(furnitureFinishes) as finish}<option value={finish}>{finish}</option>{/each}
        </select>
      </label>

      <p class="text-xs text-gray-500">Color tints the 3D model; materials adjust its finish. Reset to defaults restores the original appearance.</p>
      
      <!-- Rotation -->
      <label class="block">
        <span class="text-xs text-gray-500">Rotation (degrees)</span>
        <input 
          type="number" 
          value={Math.round(selectedFurniture.rotation * 100) / 100} 
          oninput={onFurnitureRotation} 
          class="w-full px-2 py-1 border border-gray-200 rounded text-sm" 
        />
      </label>

      <!-- Rotate / Flip controls -->
      <div class="flex gap-1">
        <button
          onclick={() => { if (selectedFurniture) updateFurniture(selectedFurniture.id, { rotation: selectedFurniture.rotation - 90 }); }}
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 transition-colors"
          title="Rotate 90° left"
        >↺ 90°</button>
        <button
          onclick={() => { if (selectedFurniture) updateFurniture(selectedFurniture.id, { rotation: selectedFurniture.rotation + 90 }); }}
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 transition-colors"
          title="Rotate 90° right"
        >↻ 90°</button>
      </div>
      <div class="flex gap-1">
        <button
          onclick={() => { if (selectedFurniture) { const s = selectedFurniture.scale; updateFurniture(selectedFurniture.id, { scale: { x: s.x * -1, y: s.y, z: s.z } }); } }}
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 transition-colors"
          title="Flip horizontally"
        >↔ Flip H</button>
        <button
          onclick={() => { if (selectedFurniture) { const s = selectedFurniture.scale; updateFurniture(selectedFurniture.id, { scale: { x: s.x, y: s.y * -1, z: s.z } }); } }}
          class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 transition-colors"
          title="Flip vertically"
        >↕ Flip V</button>
      </div>
      
      <!-- Reset button -->
      <button
        onclick={resetFurnitureDefaults}
        class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Reset to defaults
      </button>
    </div>
{/if}
