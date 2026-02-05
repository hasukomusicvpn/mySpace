<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabaseClient'

  type MoodKey = 'happy' | 'good' | 'neutral' | 'bad' | 'sad'

  type DayMood = {
    label: string
    dateKey: string
    mood: MoodKey | null
  }

  const MOODS: Record<MoodKey, { emoji: string; bg: string }> = {
    happy: { emoji: '😄', bg: 'bg-yellow-300' },
    good: { emoji: '🙂', bg: 'bg-green-300' },
    neutral: { emoji: '😐', bg: 'bg-gray-300' },
    bad: { emoji: '😕', bg: 'bg-orange-300' },
    sad: { emoji: '😢', bg: 'bg-red-300' }
  }

  function normalizeMood(input: unknown): MoodKey | null {
    if (typeof input !== 'string') return null
    const s = input.trim().toLowerCase()

    // If you stored "😐 Neutral" etc, this still works:
    if (s.includes('happy')) return 'happy'
    if (s.includes('good')) return 'good'
    if (s.includes('neutral')) return 'neutral'
    if (s.includes('bad')) return 'bad'
    if (s.includes('sad')) return 'sad'

    // If you stored just the emoji:
    if (s.includes('😄')) return 'happy'
    if (s.includes('🙂')) return 'good'
    if (s.includes('😐')) return 'neutral'
    if (s.includes('😕')) return 'bad'
    if (s.includes('😢')) return 'sad'

    return null
  }

  let loading = true
  let errorMsg = ''
  let week: DayMood[] = []

  function localDateKey(date: Date | string) {
    const d = new Date(date)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  function buildWeek(): DayMood[] {
    const today = new Date()
    const day = today.getDay() || 7 // Sunday=7
    const monday = new Date(today)
    monday.setDate(today.getDate() - (day - 1))
    monday.setHours(0, 0, 0, 0)

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return {
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dateKey: localDateKey(d),
        mood: null
      }
    })
  }

  async function loadWeek() {
    loading = true
    errorMsg = ''
    week = buildWeek()

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) {
      errorMsg = 'Not signed in'
      loading = false
      return
    }
    const user = userRes.user

    const start = new Date(week[0].dateKey + 'T00:00:00')
    const end = new Date(week[6].dateKey + 'T23:59:59')

    const { data, error } = await supabase
      .from('moods')
      .select('mood, created_at')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      errorMsg = error.message
      loading = false
      return
    }

    console.log('WEEKLY QUERY', {
  userId: user.id,
  start: start.toISOString(),
  end: end.toISOString(),
  count: data?.length,
  error
})

    const filled = new Set<string>()
    for (const row of data ?? []) {
      const key = localDateKey(row.created_at)
      if (filled.has(key)) continue

      const mood = normalizeMood((row as any).mood)
      if (!mood) continue // ignore unknown moods safely

      const slot = week.find((d) => d.dateKey === key)
      if (slot) {
        slot.mood = mood
        filled.add(key)
      }
    }

    loading = false

    week = [...week]
  }

  

  onMount(loadWeek)

  export let refreshToken = 0
  let lastRefresh = 0
  $: if (refreshToken !== lastRefresh) {
    lastRefresh = refreshToken
    loadWeek()
  }
</script>

<div class="col-span-12 lg:col-span-6">
  <div class="rounded-2xl bg-white/90 backdrop-blur border border-white/30 p-5 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-900">Weekly Mood</h2>
      <button
        class="text-xs px-3 py-1 rounded-full bg-black/5 hover:bg-black/10"
        on:click={loadWeek}
        disabled={loading}
      >
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </div>

    {#if errorMsg}
      <p class="text-sm text-red-600 mb-3">{errorMsg}</p>
    {/if}

    <div class="grid grid-cols-7 gap-2 text-center">
      {#each week as d}
        <div class="flex flex-col items-center gap-2">
          <span class="text-xs text-gray-500">{d.label}</span>

          {#if d.mood}
            <div class={`w-10 h-10 rounded-xl flex items-center justify-center ${MOODS[d.mood].bg}`}>
              <span class="text-lg">{MOODS[d.mood].emoji}</span>
            </div>
          {:else}
            <div class="w-10 h-10 rounded-xl border bg-gray-100"></div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
      <span>😄 Happy</span>
      <span>🙂 Good</span>
      <span>😐 Neutral</span>
      <span>😕 Bad</span>
      <span>😢 Sad</span>
    </div>
  </div>
</div>
