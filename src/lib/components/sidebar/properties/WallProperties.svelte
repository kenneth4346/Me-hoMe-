<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activeFloor, selectedElementId, updateWall, resizeWallLength, reverseWall, elevationWallId } from '$lib/stores/project';
  import { wallLength as calcWallLength, wallAngle, wallLengthDisplayValue, wallLengthInputToCm, wallLengthUnitLabel, MIN_WALL_LENGTH, type WallEndpoint } from '$lib/utils/wallEditing';
  import { openingOnWall } from '$lib/utils/wallProfiles';
  import { wallColors } from '$lib/utils/materials';
  import { catalogAssetUrl } from '$lib/utils/catalogAssetUrl';
  import { projectSettings } from '$lib/stores/settings';
  import type { Floor, Wall } from '$lib/models/types';
  import { getWallStartHeight, getWallEndHeight } from '$lib/models/types';

  let floor = $state<Floor | null>(null);
  let selId: string | null = $state(null);
  onDestroy(activeFloor.subscribe((f) => { floor = f; }));
  onDestroy(selectedElementId.subscribe((id) => { selId = id; }));
  let settings = $state($projectSettings);
  onDestroy(projectSettings.subscribe((s) => { settings = s; }));
  function displayValue(cm: number): number {
    return settings.units === 'imperial' ? Math.round(cm / 2.54 * 10) / 10 : Math.round(cm * 1000) / 1000;
  }
  function unitLabel(): string {
    return settings.units === 'imperial' ? 'in' : 'cm';
  }

  let wallSideTab = $state<'interior' | 'exterior'>('interior');
  let selectedWall = $derived(floor?.walls?.find(w => w.id === selId) ?? null);
  let wallLength = $derived(selectedWall ? Math.round(calcWallLength(selectedWall) * 1000) / 1000 : 0);
  let fixedEndpoint = $state<WallEndpoint>('start');
  let wallLengthError = $state<string | null>(null);
  $effect(() => { void selId; fixedEndpoint = 'start'; wallLengthError = null; });
  let selectedWallAngle = $derived(selectedWall ? wallAngle(selectedWall) : 0);

  function dimensionInput(e: Event, current: number, save: (cm: number) => void, zeroAllowed = false, max = Infinity) {
    const input = e.target as HTMLInputElement;
    const value = settings.units === 'imperial' ? input.valueAsNumber * 2.54 : input.valueAsNumber;
    const valid = input.value.trim() && input.validity.valid && Number.isFinite(value) && (zeroAllowed ? value >= 0 : value > 0) && value <= max;
    if (valid && input.valueAsNumber !== displayValue(current)) save(value);
    else if (!valid && e.type === 'blur') input.value = String(displayValue(current));
  }
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
  const wallTexPaths: Record<string, string> = {
    'red-brick': catalogAssetUrl(`/textures/brick.webp`), 'exposed-brick': catalogAssetUrl(`/textures/exposed-brick.webp`),
    'stone': catalogAssetUrl(`/textures/stone.webp`), 'wood-panel': catalogAssetUrl(`/textures/wood-panel.webp`),
    'concrete-block': catalogAssetUrl(`/textures/concrete.webp`), 'subway-tile': catalogAssetUrl(`/textures/subway-tile.webp`),
  };
</script>

{#if selectedWall}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">▭</span>
      Wall Properties
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">Length ({wallLengthUnitLabel(settings.units)})</span>
        <input type="number" value={wallLengthDisplayValue(wallLength, settings.units)} onblur={onWallLength} onkeydown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} min={settings.units === 'imperial' ? MIN_WALL_LENGTH / 2.54 : MIN_WALL_LENGTH * 10} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <div>
        <span class="text-xs text-gray-500">Angle (°)</span>
        <p class="text-sm text-gray-700">{selectedWallAngle.toFixed(1)}</p>
        <p class="text-xs text-gray-500">Chord from start to end, normalized to [0, 360).</p>
      </div>
      <label class="block">
        <span class="text-xs text-gray-500">Keep fixed</span>
        <select bind:value={fixedEndpoint} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="start">Start (A)</option>
          <option value="end">End (B)</option>
        </select>
      </label>
      <p class="text-xs text-gray-500">Joined corners follow the moving endpoint. Openings keep their relative positions.</p>
      {#if wallLengthError}<p role="alert" class="text-xs text-red-700">{wallLengthError}</p>{/if}
      <label class="block">
        <span class="text-xs text-gray-500">Thickness ({unitLabel()})</span>
        <input type="number" value={displayValue(selectedWall.thickness)} oninput={onWallThickness} onblur={onWallThickness} step="any" class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <div class="grid grid-cols-2 gap-2">
        <label class="block">
          <span class="text-xs text-gray-500">Start Height ({unitLabel()})</span>
          <input type="number" value={displayValue(getWallStartHeight(selectedWall))} min="0" step="any" oninput={onWallStartHeight} onblur={onWallStartHeight} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-500">End Height ({unitLabel()})</span>
          <input type="number" value={displayValue(getWallEndHeight(selectedWall))} min="0" step="any" oninput={onWallEndHeight} onblur={onWallEndHeight} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
        </label>
      </div>
      {#if clippedOpenings}
        <p role="status" class="text-xs text-amber-800 bg-amber-50 rounded p-2">Some openings do not fit this wall. Elevation and 3D clip their preview; saved dimensions stay unchanged. Raise the wall or resize/reposition the openings.</p>
      {/if}
      <div class="flex items-center gap-2">
        {#if getWallStartHeight(selectedWall) !== getWallEndHeight(selectedWall)}
          <button
            onclick={equalizeWallHeights}
            class="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
          >
            ↔️ Equalize ({displayValue(getWallStartHeight(selectedWall))} {unitLabel()})
          </button>
        {/if}
        <button
          onclick={() => { if (selectedWall) reverseWall(selectedWall.id); }}
          class="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-2 py-0.5 rounded flex items-center gap-1 ml-auto"
          title="Reverse wall direction (swap start/end points and heights)"
        >
          🔄 Reverse direction
        </button>
      </div>
      <button
        class="w-full py-1.5 text-sm rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
        onclick={() => { if (selectedWall) elevationWallId.set(selectedWall.id); }}
        title="View this wall face-on and edit its doors and windows"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="1"/><line x1="3" y1="18" x2="21" y2="18"/><rect x="7" y="9" width="4" height="4"/><rect x="14" y="10" width="3" height="8"/></svg>
        Elevation
      </button>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">Curved</span>
        <button
          class="px-2 py-0.5 text-xs rounded {selectedWall.curvePoint ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-500 border border-gray-200'}"
          onclick={() => {
            if (selectedWall) {
              if (selectedWall.curvePoint) {
                updateWall(selectedWall.id, { curvePoint: undefined });
              } else {
                const mx = (selectedWall.start.x + selectedWall.end.x) / 2;
                const my = (selectedWall.start.y + selectedWall.end.y) / 2;
                const dx = selectedWall.end.x - selectedWall.start.x;
                const dy = selectedWall.end.y - selectedWall.start.y;
                const len = Math.hypot(dx, dy) || 1;
                updateWall(selectedWall.id, { curvePoint: { x: mx + (-dy / len) * 60, y: my + (dx / len) * 60 } });
              }
            }
          }}
        >
          {selectedWall.curvePoint ? '◆ On' : '◇ Off'}
        </button>
      </div>
      <div>
        <div class="flex border-b border-gray-200 mb-3">
          <button
            class="flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors {wallSideTab === 'interior' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}"
            onclick={() => wallSideTab = 'interior'}
          >Interior</button>
          <button
            class="flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors {wallSideTab === 'exterior' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}"
            onclick={() => wallSideTab = 'exterior'}
          >Exterior</button>
        </div>
        {#if wallSideTab === 'interior'}
          {@const sideColor = selectedWall.interiorColor || selectedWall.color}
          {@const sideTex = selectedWall.interiorTexture === 'none' ? undefined : (selectedWall.interiorTexture || selectedWall.texture)}
          <div class="space-y-2">
            <span class="text-xs text-gray-500">Color</span>
            <div class="grid grid-cols-6 gap-1.5">
              {#each wallColors as wc}
                <button
                  class="w-7 h-7 rounded-md border-2 hover:border-gray-300 transition-colors {sideColor === wc.color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
                  style="background-color: {wc.color}"
                  title={wc.name}
                  onclick={() => { if (selectedWall) updateWall(selectedWall.id, { interiorColor: wc.color }); }}
                ></button>
              {/each}
            </div>
            <label class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Custom:</span>
              <input type="color" value={sideColor} oninput={(e) => { if (selectedWall) updateWall(selectedWall.id, { interiorColor: (e.target as HTMLInputElement).value }); }} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
            </label>
            <span class="text-xs text-gray-500">Texture</span>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                class="p-1.5 rounded-md border-2 text-[10px] text-center h-14 {!sideTex ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}"
                onclick={() => { if (selectedWall) updateWall(selectedWall.id, { interiorTexture: 'none' }); }}
              >None</button>
              {#each wallColors.filter(wc => wc.texture) as wc}
                {@const texPath = wallTexPaths[wc.id] ?? ''}
                <button
                  class="rounded-md border-2 text-[10px] text-center h-14 flex flex-col items-center justify-end overflow-hidden relative {sideTex === wc.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}"
                  style={texPath ? `background-image: url(${texPath}); background-size: cover; background-position: center;` : `background-color: ${wc.color}20`}
                  onclick={() => { if (selectedWall) updateWall(selectedWall.id, { interiorTexture: wc.id, interiorColor: wc.color }); }}
                ><span class="bg-white/80 backdrop-blur-sm rounded px-1 py-0.5 mb-0.5 text-gray-700">{wc.name}</span></button>
              {/each}
            </div>
          </div>
        {:else}
          {@const sideColor = selectedWall.exteriorColor || selectedWall.color}
          {@const sideTex = selectedWall.exteriorTexture === 'none' ? undefined : (selectedWall.exteriorTexture || selectedWall.texture)}
          <div class="space-y-2">
            <span class="text-xs text-gray-500">Color</span>
            <div class="grid grid-cols-6 gap-1.5">
              {#each wallColors as wc}
                <button
                  class="w-7 h-7 rounded-md border-2 hover:border-gray-300 transition-colors {sideColor === wc.color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
                  style="background-color: {wc.color}"
                  title={wc.name}
                  onclick={() => { if (selectedWall) updateWall(selectedWall.id, { exteriorColor: wc.color }); }}
                ></button>
              {/each}
            </div>
            <label class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Custom:</span>
              <input type="color" value={sideColor} oninput={(e) => { if (selectedWall) updateWall(selectedWall.id, { exteriorColor: (e.target as HTMLInputElement).value }); }} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
            </label>
            <span class="text-xs text-gray-500">Texture</span>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                class="p-1.5 rounded-md border-2 text-[10px] text-center h-14 {!sideTex ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}"
                onclick={() => { if (selectedWall) updateWall(selectedWall.id, { exteriorTexture: 'none' }); }}
              >None</button>
              {#each wallColors.filter(wc => wc.texture) as wc}
                {@const texPath = wallTexPaths[wc.id] ?? ''}
                <button
                  class="rounded-md border-2 text-[10px] text-center h-14 flex flex-col items-center justify-end overflow-hidden relative {sideTex === wc.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}"
                  style={texPath ? `background-image: url(${texPath}); background-size: cover; background-position: center;` : `background-color: ${wc.color}20`}
                  onclick={() => { if (selectedWall) updateWall(selectedWall.id, { exteriorTexture: wc.id, exteriorColor: wc.color }); }}
                ><span class="bg-white/80 backdrop-blur-sm rounded px-1 py-0.5 mb-0.5 text-gray-700">{wc.name}</span></button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
{/if}
