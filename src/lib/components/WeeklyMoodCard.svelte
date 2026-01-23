<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabaseClient'

  type MoodKey = 'happy' | 'good' | 'neutral' | 'bad' | 'sad'
  type MoodRow = { mood: MoodKey; created_at: string }

  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

  const MOODS: Record<MoodKey, { emoji: string; bg: string }> = {
    happy: { emoji: '😄', bg: 'bg-yellow-300' },
    good: { emoji: '🙂', bg: 'bg-green-300' },
    neutral: { emoji: '😐', bg: 'bg-gray-200' },
    bad: { emoji: '😕', bg: 'bg-orange-300' },
    sad: { emoji: '😢', bg: 'bg-red-300' }
  }

  type DayMood = { day: (typeof WEEK_DAYS)[number]; mood: MoodKey | null; dateKey: string }

  let loading = true
  let errorMsg = ''
  let week: DayMood[] = []

  function toISODateKey(d: Date) {
    // local date key: YYYY-MM-DD
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  function startOfWeekMonday(date = new Date()) {
    const d = new Date(date)
    const day = d.getDay() // Sun=0..Sat=6
    const diff = day === 0 ? -6 : 1 - day // shift to Monday
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  function endOfWeekSunday(date = new Date()) {
    const start = startOfWeekMonday(date)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }

  function buildWeek(date = new Date()) {
    const start = startOfWeekMonday(date)
    return WEEK_DAYS.map((label, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return { day: label, mood: null, dateKey: toISODateKey(d) } as DayMood
    })
  }

  async function loadWeek() {
    loading = true
    errorMsg = ''
    week = buildWeek()

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr) {
      errorMsg = userErr.message
      loading = false
      return
    }

    const user = userRes.user
    if (!user) {
      errorMsg = 'Not signed in.'
      loading = false
      return
    }

    const start = startOfWeekMonday()
    const end = endOfWeekSunday()

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

    const rows = (data ?? []) as MoodRow[]

    // Fill the week by local date key (latest mood wins because we sorted desc)
    const seen = new Set<string>()
    for (const r of rows) {
      const key = toISODateKey(new Date(r.created_at))
      if (seen.has(key)) continue
      const slot = week.find((x) => x.dateKey === key)
      if (slot) {
        slot.mood = r.mood
        seen.add(key)
      }
    }

    loading = false
  }

  onMount(loadWeek)

  // (Optional) expose a manual refresh API via prop
  export let refreshToken: number = 0
  $: if (refreshToken) loadWeek()
</script>

<div class="col-span-12 lg:col-span-6">
  <div class="rounded-2xl bg-white/90 backdrop-blur border border-white/30 shadow-sm p-5">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-gray-500">This week</p>
        <h2 class="text-lg font-semibold text-gray-900">Weekly Mood</h2>
      </div>
      <button
        class="text-xs px-3 py-1 rounded-full bg-black/5 hover:bg-black/10"
        on:click={loadWeek}
        disabled={loading}
      >
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </div>

    {#if errorMsg}
      <p class="mt-3 text-sm text-red-600">{errorMsg}</p>
    {/if}

    <div class="mt-4 grid grid-cols-7 gap-2 text-center">
      {#each week as d}
        <div class="flex flex-col items-center gap-2">
          <span class="text-[11px] text-gray-500">{d.day}</span>

          {#if d.mood}
            <div class={`w-10 h-10 rounded-xl flex items-center justify-center ${MOODS[d.mood].bg}`}>
              <span class="text-lg">{MOODS[d.mood].emoji}</span>
            </div>
          {:else}
            <div class="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200"></div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border">
        😄 Happy
      </span>
      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border">
        🙂 Good
      </span>
      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border">
        😐 Neutral
      </span>
      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border">
        😕 Bad
      </span>
      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border">
        😢 Sad
      </span>
    </div>
  </div>
</div>