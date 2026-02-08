<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { supabase } from '$lib/supabaseClient'
  import AddTodoModal from '$lib/components/AddTodoModal.svelte'

  type Todo = {
    id: string
    content: string
    is_done: boolean
    created_at: string
  }

  let todos: Todo[] = []
  let loading = true
  let errorMsg = ''
  let togglingId: string | null = null

  let showAdd = false
  export let limit = 4

  async function loadPreview() {
    loading = true
    errorMsg = ''

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (!user) {
      errorMsg = 'Not signed in'
      loading = false
      return
    }

    const { data, error } = await supabase
      .from('todos')
      .select('id, content, is_done, created_at')
      .eq('user_id', user.id)
      .eq('is_done', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) errorMsg = error.message
    todos = data ?? []
    loading = false
  }

  async function markDone(todo: Todo) {
    if (togglingId) return
    togglingId = todo.id
    errorMsg = ''

    // optimistic remove
    const before = todos
    todos = todos.filter((t) => t.id !== todo.id)

    const { error } = await supabase
      .from('todos')
      .update({
        is_done: true,
        done_at: new Date().toISOString()
      })
      .eq('id', todo.id)

    if (error) {
      todos = before
      errorMsg = error.message
    } else {
      await loadPreview()
    }

    togglingId = null
  }

  onMount(loadPreview)
</script>

<AddTodoModal
  bind:open={showAdd}
  on:added={() => loadPreview()}
/>

<div class="col-span-12 lg:col-span-6">
  <div class="rounded-2xl bg-galaxy-card border border-galaxy-border p-5">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-galaxy-text">To-Do</h2>

      <div class="flex items-center gap-2">
        <!-- Quick add button -->
        <button
          class="h-9 w-9 rounded-xl bg-galaxy-blue text-white font-bold hover:brightness-110"
          on:click={() => (showAdd = true)}
          title="Quick add"
        >
          +
        </button>

        <button
          class="text-sm text-galaxy-muted hover:text-galaxy-text"
          on:click={() => goto('/todo')}
        >
          View all →
        </button>
      </div>
    </div>

    {#if errorMsg}
      <p class="mt-3 text-sm text-red-400">{errorMsg}</p>
    {/if}

    <div class="mt-4 space-y-2">
      {#if loading}
        <p class="text-galaxy-muted">Loading…</p>
      {:else if todos.length === 0}
        <p class="text-galaxy-muted">No tasks left. You’re free 😌</p>
      {:else}
        {#each todos as t (t.id)}
          <div class="flex items-center gap-3 rounded-xl border border-galaxy-border bg-galaxy-void px-4 py-3">
            <!-- mark done -->
            <button
              type="button"
              class="h-5 w-5 rounded-md border border-galaxy-border bg-black/20 hover:bg-black/30 flex items-center justify-center"
              on:click={() => markDone(t)}
              aria-label="Mark done"
              disabled={togglingId === t.id}
              title="Mark done"
            >
              {#if togglingId === t.id}
                <span class="text-[10px] text-galaxy-muted">…</span>
              {:else}
                <span class="text-[12px] text-galaxy-muted">✓</span>
              {/if}
            </button>

            <p class="text-sm text-galaxy-text line-clamp-1 flex-1">{t.content}</p>

            <button
              class="text-xs text-galaxy-muted hover:text-galaxy-text"
              on:click={() => goto('/todo')}
              title="Open To-Do page"
            >
              Open
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <div class="mt-4 flex items-center justify-between">
      <button
        class="text-xs px-3 py-1 rounded-full bg-black/20 text-galaxy-muted hover:text-galaxy-text"
        on:click={loadPreview}
      >
        Refresh
      </button>

      <button
        class="text-xs px-3 py-1 rounded-full bg-galaxy-blue text-white hover:brightness-110"
        on:click={() => (showAdd = true)}
      >
        Quick add
      </button>
    </div>
  </div>
</div>
