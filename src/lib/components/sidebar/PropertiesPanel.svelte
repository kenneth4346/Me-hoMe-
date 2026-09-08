<script lang="ts">
  import { onDestroy } from 'svelte';
  import ItemDetailsPanel from './ItemDetailsPanel.svelte';
  import type { DetailTarget } from '$lib/models/types';
  import { activeFloor, selectedElementId, selectedRoomId, detectedRoomsStore } from '$lib/stores/project';
  import type { Floor, Room } from '$lib/models/types';
  import WallProperties from './properties/WallProperties.svelte';
  import OpeningProperties from './properties/OpeningProperties.svelte';
  import FurnitureProperties from './properties/FurnitureProperties.svelte';
  import RoomProperties from './properties/RoomProperties.svelte';
  import MiscProperties from './properties/MiscProperties.svelte';
  import BackgroundControls from './properties/BackgroundControls.svelte';

  let { is3D = false }: { is3D?: boolean } = $props();
  let floor = $state<Floor | null>(null);
  let selId: string | null = $state(null);
  let selRoomId: string | null = $state(null);
  let detectedRooms: Room[] = $state([]);
  onDestroy(activeFloor.subscribe((f) => { floor = f; }));
  onDestroy(selectedElementId.subscribe((id) => { selId = id; }));
  onDestroy(selectedRoomId.subscribe((id) => { selRoomId = id; }));
  onDestroy(detectedRoomsStore.subscribe((rooms) => { detectedRooms = rooms; }));

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

  let panel = $derived.by(() => {
    if (selectedWall) return 'wall';
    if (selectedDoor || selectedWindow) return 'opening';
    if (selectedFurniture) return 'furniture';
    if (selectedRoom) return 'room';
    if (selectedEntourage || selectedStair || selectedColumn || selectedTextAnnotation) return 'misc';
    if (!is3D && hasBgImage) return 'bg';
    return null;
  });

  let detailTarget = $derived.by((): DetailTarget | null => {
    if (!floor) return null;
    for (const [kind, item] of [['walls', selectedWall], ['doors', selectedDoor], ['windows', selectedWindow], ['furniture', selectedFurniture], ['rooms', selectedRoom]] as const) {
      if (item) return { floorId: floor.id, kind, id: item.id };
    }
    return null;
  });

  let hasSelection = $derived(!!selectedWall || !!selectedDoor || !!selectedWindow || !!selectedFurniture || !!selectedRoom || !!selectedStair || !!selectedColumn || !!selectedTextAnnotation || !!selectedEntourage || (!is3D && hasBgImage));
</script>

<!-- Right sidebar on md+; slides up as a bottom sheet on phones -->
<div class="{is3D ? 'w-80' : 'w-64'} shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto p-3 fixed md:static right-0 top-12 bottom-9 z-40 shadow-lg max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:w-full max-md:max-h-[45vh] max-md:border-l-0 max-md:border-t max-md:rounded-t-xl max-md:shadow-2xl" class:hidden={!hasSelection}>
  {#if panel === 'wall'}
    <WallProperties />
  {:else if panel === 'opening'}
    <OpeningProperties />
  {:else if panel === 'furniture'}
    <FurnitureProperties />
  {:else if panel === 'room'}
    <RoomProperties />
  {:else if panel === 'misc'}
    <MiscProperties />
  {/if}

  {#if detailTarget}
    {#key `${detailTarget.floorId}:${detailTarget.kind}:${detailTarget.id}`}
      <ItemDetailsPanel target={detailTarget} />
    {/key}
  {/if}

  <BackgroundControls />
</div>
