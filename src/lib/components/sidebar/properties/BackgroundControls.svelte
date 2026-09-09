<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activeFloor, updateBackgroundImage, setBackgroundImage, calibrationMode, calibrationPoints } from '$lib/stores/project';
  import type { Floor } from '$lib/models/types';

  let floor = $state<Floor | null>(null);
  onDestroy(activeFloor.subscribe((f) => { floor = f; }));
  let hasBgImage = $derived(!!floor?.backgroundImage);
</script>

  {#if hasBgImage && floor?.backgroundImage}
    <div class="mt-4 pt-3 border-t border-gray-200">
      <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span class="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-xs">🖼️</span>
        Background Image
      </h3>
      <div class="space-y-3">
        <label class="block">
          <span class="text-xs text-gray-500">Opacity</span>
          <input type="range" min="0.05" max="1" step="0.05" value={floor.backgroundImage.opacity} oninput={(e) => updateBackgroundImage({ opacity: Number((e.target as HTMLInputElement).value) })} class="w-full" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-500">Scale</span>
          <input type="range" min="0.1" max="5" step="0.05" value={floor.backgroundImage.scale} oninput={(e) => updateBackgroundImage({ scale: Number((e.target as HTMLInputElement).value) })} class="w-full" />
        </label>
        <label class="block">
          <span class="text-xs text-gray-500">Rotation</span>
          <input type="number" value={floor.backgroundImage.rotation} oninput={(e) => updateBackgroundImage({ rotation: Number((e.target as HTMLInputElement).value) })} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
        </label>
        <div class="flex gap-2">
          <button
            onclick={() => updateBackgroundImage({ locked: !floor!.backgroundImage!.locked })}
            class="flex-1 px-2 py-1.5 border rounded text-sm {floor.backgroundImage.locked ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-200 hover:bg-gray-50'}"
          >{floor.backgroundImage.locked ? '🔒 Locked' : '🔓 Unlocked'}</button>
          <button
            onclick={() => { calibrationPoints.set([]); calibrationMode.set(true); }}
            class="flex-1 px-2 py-1.5 border rounded text-sm border-gray-200 hover:bg-gray-50"
          >📏 Set Scale</button>
        </div>
        <button
          onclick={() => setBackgroundImage(undefined)}
          class="w-full px-2 py-1.5 border border-red-300 rounded text-sm text-red-600 hover:bg-red-50"
        >Remove Image</button>
      </div>
    </div>
  {/if}
