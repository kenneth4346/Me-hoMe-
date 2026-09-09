<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activeFloor, selectedElementId, updateStair, updateColumn, updateTextAnnotation, updateEntourageItem, removeElement } from '$lib/stores/project';
  import { getEntourageDef } from '$lib/utils/entourageCatalog';
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
  let selectedStair = $derived(floor?.stairs?.find(s => s.id === selId) ?? null);
  let selectedColumn = $derived(floor?.columns?.find(c => c.id === selId) ?? null);
  let selectedTextAnnotation = $derived(floor?.textAnnotations?.find(t => t.id === selId) ?? null);
  let selectedEntourage = $derived(floor?.entourage?.find(en => en.id === selId) ?? null);

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
</script>

{#if selectedEntourage}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-xs">🌳</span>
      Entourage
    </h3>
    <div class="space-y-3">
      <div>
        <span class="text-xs text-gray-500">Symbol</span>
        <p class="text-sm text-gray-700">{getEntourageDef(selectedEntourage.defId)?.name ?? 'Custom image'}</p>
      </div>
      <label class="block">
        <span class="text-xs text-gray-500">Width ({unitLabel()})</span>
        <input type="number" value={displayValue(Math.round(selectedEntourage.width))} oninput={(e) => { if (selectedEntourage) updateEntourageItem(selectedEntourage.id, { width: Math.max(1, inputToCm(Number((e.target as HTMLInputElement).value)) || 1) }); }} min="1" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Rotation (°)</span>
        <input type="number" value={Math.round(selectedEntourage.rotation || 0)} oninput={(e) => { if (selectedEntourage) updateEntourageItem(selectedEntourage.id, { rotation: Number((e.target as HTMLInputElement).value) || 0 }); }} step="15" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Opacity ({Math.round((selectedEntourage.opacity ?? 1) * 100)}%)</span>
        <input type="range" min="0.1" max="1" step="0.05" value={selectedEntourage.opacity ?? 1} oninput={(e) => { if (selectedEntourage) updateEntourageItem(selectedEntourage.id, { opacity: Number((e.target as HTMLInputElement).value) }); }} class="w-full" />
      </label>
      <div class="flex gap-2">
        <button onclick={() => { if (selectedEntourage) updateEntourageItem(selectedEntourage.id, { locked: !selectedEntourage.locked }); }} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedEntourage.locked ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 hover:bg-gray-50'}">{selectedEntourage.locked ? '🔒 Locked' : '🔓 Unlocked'}</button>
        <button onclick={() => { if (selectedEntourage) { removeElement(selectedEntourage.id); selectedElementId.set(null); } }} class="flex-1 px-2 py-1.5 border border-red-200 text-red-600 rounded text-sm hover:bg-red-50 transition-colors">Delete</button>
      </div>
    </div>
{:else if selectedStair}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">🪜</span>
      Stair Properties
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">Type</span>
        <select value={selectedStair.stairType || 'straight'} onchange={(e) => updateStair(selectedStair!.id, { stairType: (e.target as HTMLSelectElement).value as any })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="straight">Straight</option>
          <option value="l-shaped">L-Shaped</option>
          <option value="u-shaped">U-Shaped</option>
          <option value="spiral">Spiral</option>
        </select>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Width ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedStair.width)} oninput={(e) => updateStair(selectedStair!.id, { width: inputToCm(Number((e.target as HTMLInputElement).value)) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Depth ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedStair.depth)} oninput={(e) => updateStair(selectedStair!.id, { depth: inputToCm(Number((e.target as HTMLInputElement).value)) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Risers</span>
        <input type="number" value={selectedStair.riserCount} min="3" max="30" oninput={(e) => updateStair(selectedStair!.id, { riserCount: Number((e.target as HTMLInputElement).value) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Direction</span>
        <div class="flex gap-2">
          <button onclick={() => updateStair(selectedStair!.id, { direction: 'up' })} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedStair.direction === 'up' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">Up ↑</button>
          <button onclick={() => updateStair(selectedStair!.id, { direction: 'down' })} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedStair.direction === 'down' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">Down ↓</button>
        </div>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Rotation (degrees)</span>
        <input type="number" value={selectedStair.rotation} oninput={(e) => updateStair(selectedStair!.id, { rotation: Number((e.target as HTMLInputElement).value) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
    </div>
{:else if selectedColumn}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">🏛️</span>
      Column Properties
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">Shape</span>
        <div class="flex gap-2">
          <button onclick={() => updateColumn(selectedColumn!.id, { shape: 'round' })} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedColumn.shape === 'round' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">⭕ Round</button>
          <button onclick={() => updateColumn(selectedColumn!.id, { shape: 'square' })} class="flex-1 px-2 py-1.5 border rounded text-sm transition-colors {selectedColumn.shape === 'square' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}">⬜ Square</button>
        </div>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">{selectedColumn.shape === 'round' ? 'Diameter' : 'Side Length'} ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedColumn.diameter)} min="10" max="200" oninput={(e) => updateColumn(selectedColumn!.id, { diameter: inputToCm(Number((e.target as HTMLInputElement).value)) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Height ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedColumn.height)} min="50" max="1000" oninput={(e) => updateColumn(selectedColumn!.id, { height: inputToCm(Number((e.target as HTMLInputElement).value)) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <div>
        <span class="text-xs text-gray-500 mb-1.5 block">Color</span>
        <div class="grid grid-cols-5 gap-1.5 mb-2">
          {#each columnColorPresets as preset}
            <button
              class="w-7 h-7 rounded-md border-2 hover:border-gray-300 transition-colors {selectedColumn.color === preset.color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
              style="background-color: {preset.color}"
              title={preset.name}
              onclick={() => updateColumn(selectedColumn!.id, { color: preset.color })}
            ></button>
          {/each}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Custom:</span>
          <input type="color" value={selectedColumn.color} oninput={(e) => updateColumn(selectedColumn!.id, { color: (e.target as HTMLInputElement).value })} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
        </div>
      </div>
      {#if selectedColumn.shape === 'square'}
        <label class="block">
          <span class="text-xs text-gray-500">Rotation (degrees)</span>
          <input type="number" value={selectedColumn.rotation} oninput={(e) => updateColumn(selectedColumn!.id, { rotation: Number((e.target as HTMLInputElement).value) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
        </label>
      {/if}
    </div>
{:else if selectedTextAnnotation}
    <div class="space-y-3">
      <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span class="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center text-xs">🏷️</span>
        Text Annotation
      </h3>
      <label class="block">
        <span class="text-xs text-gray-500">Text</span>
        <input type="text" value={selectedTextAnnotation.text} oninput={(e) => updateTextAnnotation(selectedTextAnnotation!.id, { text: (e.target as HTMLInputElement).value })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Font Size</span>
        <input type="number" value={selectedTextAnnotation.fontSize} min="8" max="72" oninput={(e) => updateTextAnnotation(selectedTextAnnotation!.id, { fontSize: Number((e.target as HTMLInputElement).value) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Color</span>
        <div class="flex items-center gap-2">
          <input type="color" value={selectedTextAnnotation.color} oninput={(e) => updateTextAnnotation(selectedTextAnnotation!.id, { color: (e.target as HTMLInputElement).value })} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
          <span class="text-xs text-gray-400">{selectedTextAnnotation.color}</span>
        </div>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Rotation (°)</span>
        <input type="number" value={selectedTextAnnotation.rotation} oninput={(e) => updateTextAnnotation(selectedTextAnnotation!.id, { rotation: Number((e.target as HTMLInputElement).value) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">X</span>
        <input type="number" value={Math.round(selectedTextAnnotation.x)} oninput={(e) => updateTextAnnotation(selectedTextAnnotation!.id, { x: Number((e.target as HTMLInputElement).value) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Y</span>
        <input type="number" value={Math.round(selectedTextAnnotation.y)} oninput={(e) => updateTextAnnotation(selectedTextAnnotation!.id, { y: Number((e.target as HTMLInputElement).value) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
    </div>
{/if}
