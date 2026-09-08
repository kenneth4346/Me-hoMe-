<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activeFloor, selectedRoomId, updateRoom, detectedRoomsStore } from '$lib/stores/project';
  import { floorMaterials } from '$lib/utils/materials';
  import { catalogAssetUrl } from '$lib/utils/catalogAssetUrl';
  import { projectSettings, formatLength, formatArea } from '$lib/stores/settings';
  import type { Floor, Room, RoomCategory } from '$lib/models/types';

  let floor = $state<Floor | null>(null);
  let selRoomId: string | null = $state(null);
  let detectedRooms: Room[] = $state([]);
  onDestroy(activeFloor.subscribe((f) => { floor = f; }));
  onDestroy(selectedRoomId.subscribe((id) => { selRoomId = id; }));
  onDestroy(detectedRoomsStore.subscribe((rooms) => { detectedRooms = rooms; }));
  let settings = $state($projectSettings);
  onDestroy(projectSettings.subscribe((s) => { settings = s; }));

  let selectedRoom = $derived(floor?.rooms?.find(r => r.id === selRoomId) ?? detectedRooms.find(r => r.id === selRoomId) ?? null);

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
    { id: 'living', label: 'Living Room', icon: '🛋️' },
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
  const textureGroups = [
    { label: '🎨 Plain', ids: ['none'] },
    { label: '🪵 Wood', ids: ['light-oak', 'walnut', 'bamboo', 'laminate'] },
    { label: '🔲 Tile', ids: ['ceramic-white', 'ceramic-gray', 'porcelain', 'vinyl'] },
    { label: '🪨 Stone', ids: ['marble-white', 'marble-dark', 'concrete', 'slate'] },
    { label: '🧶 Carpet', ids: ['carpet-beige', 'carpet-gray'] },
  ];
</script>

{#if selectedRoom}
    <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-xs">⬜</span>
      Room Properties
    </h3>
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-gray-500">Room Type</span>
        <select value={selectedRoomType()} onchange={onRoomType} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          {#each roomTypes as rt}
            <option value={rt.id}>{rt.icon} {rt.label}</option>
          {/each}
        </select>
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Room Name</span>
        <input type="text" value={selectedRoom.name} oninput={onRoomName} class="w-full px-2 py-1 border border-gray-200 rounded text-sm" />
      </label>
      <label class="block">
        <span class="text-xs text-gray-500">Category</span>
        <select value={selectedRoom.roomType ?? 'indoor'} onchange={(e) => { if (selectedRoom) { const v = (e.target as HTMLSelectElement).value as RoomCategory; updateRoom(selectedRoom.id, { roomType: v }); updateDetectedRoom(selectedRoom.id, { roomType: v } as any); } }} class="w-full px-2 py-1 border border-gray-200 rounded text-sm">
          <option value="indoor">🏠 Indoor</option>
          <option value="outdoor">🌳 Outdoor</option>
          <option value="garage">🚗 Garage</option>
          <option value="utility">🔧 Utility</option>
        </select>
      </label>
      <div>
        <span class="text-xs text-gray-500">Area</span>
        <p class="text-sm text-gray-700">{formatArea(selectedRoom.area, settings.units)}</p>
      </div>
      {#if selectedRoom.perimeter != null}
        <div>
          <span class="text-xs text-gray-500">Perimeter</span>
          <p class="text-sm text-gray-700">{formatLength(selectedRoom.perimeter, settings.units)}</p>
        </div>
      {/if}
      <!-- Room Color -->
      <div>
        <span class="text-xs text-gray-500 mb-1.5 block">Room Color{selectedRoom.floorTexture === 'none' ? ' (used as floor color)' : ''}</span>
        <div class="grid grid-cols-5 gap-1.5 mb-2">
          {#each roomColorPresets as preset}
            <button
              class="w-7 h-7 rounded-md border-2 hover:border-gray-300 transition-colors {selectedRoom.color === preset.color ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
              style="background-color: {preset.color}"
              title={preset.name}
              onclick={() => onRoomColor(preset.color)}
            ></button>
          {/each}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Custom:</span>
          <input type="color" value={selectedRoom.color ?? '#ffffff'} oninput={(e) => onRoomColor((e.target as HTMLInputElement).value)} class="w-8 h-6 rounded border border-gray-200 cursor-pointer" />
        </div>
      </div>
      <div>
        <div class="flex items-center gap-1 mb-2">
          <span class="text-xs text-gray-500">Floor Material</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400">
            <path d="M3 3h18v18H3z"/>
            <path d="M8 8h8v8H8z"/>
          </svg>
        </div>
        <div class="space-y-3">
          {#each textureGroups as group}
            <div>
              <span class="text-xs font-medium text-gray-600 mb-1.5 block">{group.label}</span>
              <div class="grid grid-cols-3 gap-1.5">
                {#each group.ids as matId}
                  {@const mat = floorMaterials.find(m => m.id === matId)}
                  {#if mat}
                    {@const texPath = floorTexPaths[mat.id] ?? ''}
                    <button
                      class="p-1 rounded-lg border-2 hover:border-gray-300 transition-all text-xs {selectedRoom.floorTexture === mat.id ? 'border-blue-500 ring-2 ring-blue-200 shadow-sm' : 'border-gray-200'}"
                      title={mat.name}
                      onclick={() => onRoomFloor(mat.id)}
                    >
                      <div
                        class="w-full h-12 rounded-md mb-1 overflow-hidden"
                        style={texPath ? `background-image: url(${texPath}); background-size: cover; background-position: center;` : `background-color: ${mat.id === 'none' ? (selectedRoom.color ?? mat.color) : mat.color}`}
                      ></div>
                      <div class="text-center leading-3 text-[10px] text-gray-600 truncate">{mat.name}</div>
                    </button>
                  {/if}
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
{/if}
