<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import { supabase } from '$lib/supabaseClient'

  type MoodKey = 'happy' | 'good' | 'neutral' | 'bad' | 'sad'

  const dispatch = createEventDispatcher<{ saved: { mood: MoodKey } }>()

  let open = false
  let loading = true
  let errorMsg = ''

  function startOfTodayLocal() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }

  function startOfTomorrowLocal() {
    const d = startOfTodayLocal()
    d.setDate(d.getDate() + 1)
    return d
  }

  async function checkToday() {
    loading = true
    errorMsg = ''
    open = false

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (!user) {
      loading = false
      return
    }

    const from = startOfTodayLocal().toISOString()
    const to = startOfTomorrowLocal().toISOString()

    const { data, error } = await supabase
      .from('moods')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', from)
      .lt('created_at', to)
      .limit(1)

    if (error) {
      errorMsg = error.message
      loading = false
      return
    }

    // If no mood today -> open popup
    open = (data ?? []).length === 0
    loading = false
  }

  async function saveMood(mood: MoodKey) {
    loading = true
    errorMsg = ''

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (!user) {
      loading = false
      return
    }

    const { error } = await supabase.from('moods').insert({
      user_id: user.id,
      mood
    })

    loading = false

    if (error) {
      errorMsg = error.message
      return
    }

    open = false
    dispatch('saved', { mood })
  }

  onMount(checkToday)

  // Optional: allow parent to trigger re-check by changing a prop
  export let refreshKey = 0
  $: if (refreshKey) checkToday()
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50" on:click={() => (open = false)}></div>

    <!-- Card -->
    <div class="relative w-[min(92vw,420px)] rounded-2xl bg-white p-5 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm text-gray-500">Today</p>
          <h2 class="text-lg font-semibold text-gray-900">How are you feeling?</h2>
        </div>

        <button
          class="text-sm px-2 py-1 rounded-lg bg-black/5 hover:bg-black/10"
          on:click={() => (open = false)}
          disabled={loading}
        >
          ✕
        </button>
      </div>

      {#if errorMsg}
        <p class="mt-3 text-sm text-red-600">{errorMsg}</p>
      {/if}

      <div class="mt-4 grid grid-cols-5 gap-2">
        <button class="rounded-xl border p-3 hover:bg-gray-50" disabled={loading} on:click={() => saveMood('happy')}>
          <div class="text-2xl">😄</div>
          <div class="mt-1 text-[11px] text-gray-600">Happy</div>
        </button>

        <button class="rounded-xl border p-3 hover:bg-gray-50" disabled={loading} on:click={() => saveMood('good')}>
          <div class="text-2xl">🙂</div>
          <div class="mt-1 text-[11px] text-gray-600">Good</div>
        </button>

        <button class="rounded-xl border p-3 hover:bg-gray-50" disabled={loading} on:click={() => saveMood('neutral')}>
          <div class="text-2xl">😐</div>
          <div class="mt-1 text-[11px] text-gray-600">OK</div>
        </button>

        <button class="rounded-xl border p-3 hover:bg-gray-50" disabled={loading} on:click={() => saveMood('bad')}>
          <div class="text-2xl">😕</div>
          <div class="mt-1 text-[11px] text-gray-600">Bad</div>
        </button>

        <button class="rounded-xl border p-3 hover:bg-gray-50" disabled={loading} on:click={() => saveMood('sad')}>
          <div class="text-2xl">😢</div>
          <div class="mt-1 text-[11px] text-gray-600">Sad</div>
        </button>
      </div>

      <p class="mt-3 text-xs text-gray-500">
        (You can change this later.)
      </p>
    </div>
  </div>
{/if}