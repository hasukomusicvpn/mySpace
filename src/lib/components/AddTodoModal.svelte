<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { supabase } from '$lib/supabaseClient'

  const dispatch = createEventDispatcher<{
    close: void
    added: { count: number }
  }>()

  export let open = false

  let text = ''
  let loading = false
  let errorMsg = ''

  function close() {
    open = false
    dispatch('close')
  }

  function parseLines(input: string) {
    return input
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 50) // safety: max 50 tasks at once
  }

  async function addTodos() {
    if (loading) return
    errorMsg = ''

    const lines = parseLines(text)
    if (lines.length === 0) {
      errorMsg = 'Paste or type at least 1 task.'
      return
    }

    loading = true

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    const user = userRes.user
    if (userErr || !user) {
      errorMsg = 'Not signed in.'
      loading = false
      return
    }

    const rows = lines.map((content) => ({
      user_id: user.id,
      content
    }))

    const { error } = await supabase.from('todos').insert(rows)

    loading = false

    if (error) {
      errorMsg = error.message
      return
    }

    // success
    const count = lines.length
    text = ''
    dispatch('added', { count })
    close()
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- backdrop -->
    <div class="absolute inset-0 bg-black/60" on:click={close}></div>

    <!-- modal -->
    <div
      class="relative w-[min(92vw,520px)] rounded-2xl border border-galaxy-border bg-galaxy-card p-5 shadow-xl"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm text-galaxy-muted">Quick Add</p>
          <h2 class="text-lg font-semibold text-galaxy-text">Add tasks</h2>
          <p class="mt-1 text-xs text-galaxy-subtle">
            One task per line. Paste multiple lines to add many at once.
          </p>
        </div>

        <button
          class="text-sm px-2 py-1 rounded-lg bg-black/20 text-galaxy-muted hover:text-galaxy-text"
          on:click={close}
          disabled={loading}
        >
          ✕
        </button>
      </div>

      {#if errorMsg}
        <p class="mt-3 text-sm text-red-300">{errorMsg}</p>
      {/if}

      <textarea
        class="mt-4 w-full min-h-[160px] resize-y rounded-xl bg-galaxy-void border border-galaxy-border p-3 text-sm text-galaxy-text outline-none placeholder:text-galaxy-subtle"
        placeholder={"Math homework\nFinish English essay\nReview physics notes"}
        bind:value={text}
      ></textarea>

      <div class="mt-4 flex items-center justify-between gap-3">
        <button
          class="text-sm px-4 py-2 rounded-xl bg-black/20 text-galaxy-muted hover:text-galaxy-text"
          on:click={() => (text = '')}
          disabled={loading}
        >
          Clear
        </button>

        <button
          class="text-sm px-4 py-2 rounded-xl bg-galaxy-blue text-white font-semibold hover:brightness-110 disabled:opacity-60"
          on:click={addTodos}
          disabled={loading}
        >
          {loading ? 'Adding…' : 'Add tasks'}
        </button>
      </div>
    </div>
  </div>
{/if}
