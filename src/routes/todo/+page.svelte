<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabaseClient'
  import EditTodoModal from '$lib/components/EditTodoModal.svelte'

  type Todo = {
    id: string
    content: string
    is_done: boolean
    created_at: string
    due_date: string | null
    details: string | null
  }

  let todos: Todo[] = []

  // create new task
  let input = ''
  let dueDate = ''
  let details = ''

  let loading = true
  let errorMsg = ''

  // edit modal state
  let editOpen = false
  let editSaving = false
  let editError = ''
  let editId: string | null = null
  let editTitle = ''
  let editDueDate = ''
  let editDetails = ''

  // details expand behavior (single open; closing protection)
  let openId: string | null = null
  let closingId: string | null = null

  const DETAILS_H = 220 // px

  function toggleOpen(id: string) {
    if (openId !== id) {
      openId = id
      closingId = null
      return
    }

    openId = null
    closingId = id

    window.setTimeout(() => {
      if (closingId === id) closingId = null
    }, 320)
  }

  // Tabs (filters)
  type FilterKey = 'all' | 'today' | 'overdue' | 'week' | 'done'
  let filter: FilterKey = 'all'

  function ymd(d: Date) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  function startOfToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }

  function endOfWeekISO() {
    const d = startOfToday()
    const day = d.getDay() // 0=Sun
    const diffToSunday = 7 - day
    const end = new Date(d)
    end.setDate(d.getDate() + diffToSunday)
    return ymd(end)
  }

  function isTodayISO(iso: string) {
    return iso === ymd(startOfToday())
  }

  function isOverdueISO(iso: string) {
    const today = ymd(startOfToday())
    return iso < today
  }

  function isThisWeekISO(iso: string) {
    const today = ymd(startOfToday())
    const end = endOfWeekISO()
    return iso >= today && iso <= end
  }

  $: filteredTodos =
    filter === 'all'
      ? todos
      : filter === 'done'
        ? todos.filter((t) => t.is_done)
        : filter === 'today'
          ? todos.filter((t) => !t.is_done && t.due_date && isTodayISO(t.due_date))
          : filter === 'overdue'
            ? todos.filter((t) => !t.is_done && t.due_date && isOverdueISO(t.due_date))
            : filter === 'week'
              ? todos.filter((t) => !t.is_done && t.due_date && isThisWeekISO(t.due_date))
              : todos

  function prettyDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  function daysLeft(dueIso: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueIso + 'T00:00:00')
    return Math.ceil((due.getTime() - today.getTime()) / 86400000)
  }

  function daysClass(n: number) {
    if (n <= 3) return 'text-red-300 bg-red-500/10 border-red-500/20'
    if (n <= 6) return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20'
    return 'text-green-300 bg-green-500/10 border-green-500/20'
  }

  function daysLabel(n: number) {
    if (n < 0) return `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} overdue`
    if (n === 0) return 'Due today'
    return `${n} day${n === 1 ? '' : 's'} left`
  }

  function openDatePicker() {
    const el = document.getElementById('dueDatePicker') as HTMLInputElement | null
    if (!el) return
    // @ts-ignore
    if (typeof el.showPicker === 'function') el.showPicker()
    else {
      el.focus()
      el.click()
    }
  }

  async function loadTodos() {
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
      .select('id, content, is_done, created_at, due_date, details')
      .eq('user_id', user.id)
      .order('is_done', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      errorMsg = error.message
      loading = false
      return
    }

    todos = (data ?? []) as Todo[]
    loading = false
  }

  async function addTodo() {
    errorMsg = ''
    const text = input.trim()
    if (!text) return
    if (!dueDate) {
      errorMsg = 'Please select a due date.'
      return
    }

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (!user) return

    const { error } = await supabase.from('todos').insert({
      user_id: user.id,
      content: text,
      due_date: dueDate,
      details: details.trim() || null
    })

    if (error) {
      errorMsg = error.message
      return
    }

    input = ''
    dueDate = ''
    details = ''
    await loadTodos()
  }

  async function toggleTodo(todo: Todo) {
    errorMsg = ''
    const { error } = await supabase
      .from('todos')
      .update({
        is_done: !todo.is_done,
        done_at: !todo.is_done ? new Date().toISOString() : null
      })
      .eq('id', todo.id)

    if (error) {
      errorMsg = error.message
      return
    }

    await loadTodos()
  }

  async function removeTodo(todo: Todo) {
    errorMsg = ''
    const { error } = await supabase.from('todos').delete().eq('id', todo.id)
    if (error) {
      errorMsg = error.message
      return
    }
    await loadTodos()
  }

  async function deleteAllDone() {
    const confirmed = confirm('Delete all completed tasks? This cannot be undone.')
    if (!confirmed) return

    errorMsg = ''

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (!user) return

    const { error } = await supabase.from('todos').delete().eq('user_id', user.id).eq('is_done', true)

    if (error) {
      errorMsg = error.message
      return
    }

    await loadTodos()
  }

  function openEdit(todo: Todo) {
    openId = null
    closingId = null
    editError = ''
    editId = todo.id
    editTitle = todo.content ?? ''
    editDueDate = todo.due_date ?? ''
    editDetails = todo.details ?? ''
    editOpen = true
  }

  function closeEdit() {
    editOpen = false
    editSaving = false
    editError = ''
    editId = null
  }

  async function saveEdit() {
    if (!editId) return
    editError = ''

    const title = editTitle.trim()
    if (!title) {
      editError = 'Task name is required.'
      return
    }
    if (!editDueDate) {
      editError = 'Due date is required.'
      return
    }

    editSaving = true

    const { error } = await supabase
      .from('todos')
      .update({
        content: title,
        due_date: editDueDate,
        details: editDetails.trim() || null
      })
      .eq('id', editId)

    editSaving = false
    if (error) {
      editError = error.message
      return
    }

    closeEdit()
    await loadTodos()
  }

  // Bulk add
  let showBulk = false
  let bulkText = ''
  let bulkError = ''

  async function addBulkTodos() {
    bulkError = ''
    errorMsg = ''

    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return

    const items: { content: string; due_date: string; details: string | null }[] = []

    for (const line of lines) {
      const parts = line.split('|').map((p) => p.trim())
      const title = parts[0]
      const date = parts[1]
      const det = parts[2] ?? ''

      if (!title || !date) {
        bulkError = 'Each line must be: Task | YYYY-MM-DD | optional details'
        return
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        bulkError = 'Date must be YYYY-MM-DD (example: 2026-01-10)'
        return
      }

      items.push({
        content: title,
        due_date: date,
        details: det ? det : null
      })
    }

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (!user) {
      bulkError = 'Not signed in'
      return
    }

    const payload = items.map((it) => ({ ...it, user_id: user.id }))

    const { error } = await supabase.from('todos').insert(payload)
    if (error) {
      bulkError = error.message
      return
    }

    bulkText = ''
    showBulk = false
    await loadTodos()
  }

  onMount(loadTodos)
</script>

<EditTodoModal
  open={editOpen}
  saving={editSaving}
  errorMsg={editError}
  bind:title={editTitle}
  bind:dueDate={editDueDate}
  bind:details={editDetails}
  onClose={closeEdit}
  onSave={saveEdit}
/>

<div class="col-span-12">
  <div class="flex items-center justify-between gap-3">
    <h1 class="text-xl font-bold text-galaxy-text">To-Do List</h1>

    <button
      class="rounded-xl bg-black/20 px-4 py-2 text-galaxy-muted hover:text-galaxy-text"
      on:click={loadTodos}
      disabled={loading}
    >
      Refresh
    </button>
  </div>

  {#if errorMsg}
    <p class="mt-3 text-sm text-red-400">{errorMsg}</p>
  {/if}

  <div class="mt-5 grid grid-cols-12 gap-4">
    <!-- Add menu -->
    <div class="col-span-12 lg:col-span-4">
      <div class="rounded-2xl bg-galaxy-card border border-galaxy-border p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-bold text-galaxy-text">Add a new task</h2>

          <button
            type="button"
            class="text-xs px-3 py-2 rounded-xl bg-black/20 text-galaxy-muted hover:text-galaxy-text transition-all"
            on:click={() => {
              showBulk = !showBulk
              bulkError = ''
            }}
          >
            {showBulk ? 'Close bulk' : 'Bulk add'}
          </button>
        </div>

        <div class="grid grid-cols-12 gap-2">
          <div class="col-span-12">
            <label class="block text-xs text-galaxy-muted mb-1">
              Task <span class="text-red-300">*</span>
            </label>
            <input
              class="w-full rounded-xl bg-galaxy-void border border-galaxy-border px-4 py-3 text-galaxy-text placeholder:text-galaxy-subtle outline-none"
              placeholder="Add a task…"
              bind:value={input}
              on:keydown={(e) => e.key === 'Enter' && addTodo()}
            />
          </div>

          <div class="col-span-12">
            <label class="block text-xs text-galaxy-muted mb-1">
              Due date <span class="text-red-300">*</span>
            </label>

            <div class="relative">
              <input
                id="dueDatePicker"
                type="date"
                class="w-full rounded-xl bg-galaxy-void border border-galaxy-border px-4 py-3 pr-12 text-galaxy-text outline-none"
                bind:value={dueDate}
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-galaxy-muted hover:text-galaxy-text"
                on:click={openDatePicker}
                tabindex="-1"
                title="Pick a date"
              >
                📅
              </button>
            </div>
          </div>

          <div class="col-span-12">
            <label class="block text-xs text-galaxy-muted mb-1">
              Details <span class="text-galaxy-subtle">(optional)</span>
            </label>
            <textarea
              class="w-full min-h-[110px] resize-y rounded-xl bg-galaxy-void border border-galaxy-border p-3 text-sm text-galaxy-text outline-none placeholder:text-galaxy-subtle"
              placeholder="More context…"
              bind:value={details}
            ></textarea>
          </div>

          <div class="col-span-12 mt-2">
            <button
              class="w-full rounded-xl bg-galaxy-blue px-4 py-3 text-white font-semibold hover:brightness-110 disabled:opacity-60"
              on:click={addTodo}
              disabled={!input.trim() || !dueDate}
            >
              Add
            </button>

            <p class="mt-2 text-xs text-galaxy-subtle">
              <span class="text-red-300">*</span> = required
            </p>
          </div>
        </div>

        {#if showBulk}
          <div class="mt-4 rounded-2xl border border-galaxy-border bg-black/10 p-4">
            <p class="text-xs text-galaxy-muted mb-2">
              Bulk format:
              <span class="text-galaxy-text/90">Task | YYYY-MM-DD | optional details</span>
            </p>

            <textarea
              class="w-full min-h-[140px] resize-y rounded-xl bg-galaxy-void border border-galaxy-border p-3 text-sm text-galaxy-text outline-none placeholder:text-galaxy-subtle"
              placeholder="Math homework | 2026-01-10 | do chapter 4&#10;Physics lab | 2026-01-12 | bring goggles"
              bind:value={bulkText}
            ></textarea>

            {#if bulkError}
              <p class="mt-2 text-sm text-red-400">{bulkError}</p>
            {/if}

            <div class="mt-3 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-xl bg-black/20 px-4 py-2 text-sm text-galaxy-muted hover:text-galaxy-text"
                on:click={() => {
                  showBulk = false
                  bulkError = ''
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                class="rounded-xl bg-galaxy-blue px-4 py-2 text-sm text-white font-semibold hover:brightness-110 disabled:opacity-60"
                on:click={addBulkTodos}
                disabled={!bulkText.trim()}
              >
                Add all
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Tabs + tasks -->
    <div class="col-span-12 lg:col-span-8">
      <div class="tabsbar overflow-hidden">
        {#each [
          { key: 'all', label: 'All' },
          { key: 'today', label: 'Today' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'week', label: 'This week' },
          { key: 'done', label: 'Done' }
        ] as tab (tab.key)}
          {@const active = filter === (tab.key as FilterKey)}
          <button
            type="button"
            on:click={() => (filter = tab.key as FilterKey)}
            class={`tabbtn ${active ? 'tabbtn--active' : 'tabbtn--inactive'}`}
          >
            {tab.label}
          </button>
        {/each}

        <div class="ml-auto flex items-center gap-2 pb-2">
          <div class="text-xs text-galaxy-subtle">
            Showing <span class="text-galaxy-text/90">{filteredTodos.length}</span>
          </div>

          {#if filter === 'done' && filteredTodos.length > 0}
            <button
              class="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all"
              on:click={deleteAllDone}
            >
              Delete all done
            </button>
          {/if}
        </div>
      </div>

      <div class="panel rounded-b-2xl rounded-tr-2xl border border-galaxy-border bg-galaxy-card p-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-visible">
          {#if loading}
            <p class="text-galaxy-muted">Loading…</p>
          {:else if filteredTodos.length === 0}
            <p class="text-galaxy-muted">No tasks in this view.</p>
          {:else}
            {#each filteredTodos as t (t.id)}
              {@const dleft = t.due_date ? daysLeft(t.due_date) : null}
              {@const isOpen = openId === t.id}

              <div
                class={`rounded-2xl border border-galaxy-border bg-galaxy-card shadow-sm relative overflow-visible
                  transition-[margin] duration-300 ease-in-out
                  ${isOpen ? 'z-30' : closingId === t.id ? 'z-30' : 'z-0'}
                `}
                style={isOpen ? `margin-bottom: -${DETAILS_H}px;` : ''}
              >
                <div class="p-4">
                  <div class="flex items-start gap-3">
                    <input class="mt-1" type="checkbox" checked={t.is_done} on:change={() => toggleTodo(t)} />

                    <div class="flex-1 min-w-0">
                      <p class={`text-base font-semibold ${t.is_done ? 'line-through text-galaxy-subtle' : 'text-galaxy-text'}`}>
                        {t.content}
                      </p>

                      <div class="mt-2 flex flex-wrap items-center gap-2">
                        {#if dleft !== null}
                          <span class={`text-xs px-2 py-1 rounded-full border ${daysClass(dleft)}`}>
                            {daysLabel(dleft)}
                          </span>
                          <span class="text-xs px-2 py-1 rounded-full border border-galaxy-border text-galaxy-muted bg-black/10">
                            {prettyDate(t.due_date!)}
                          </span>
                        {/if}
                      </div>

                      <button
                        type="button"
                        class="mt-3 text-xs text-galaxy-muted hover:text-galaxy-text underline"
                        on:pointerdown={(e) => {
                          e.stopPropagation()
                          toggleOpen(t.id)
                        }}
                      >
                        {isOpen ? 'Hide details' : 'Show details'}
                      </button>
                    </div>

                    <div class="flex flex-col gap-2">
                      <button
                        class="text-xs px-3 py-2 rounded-xl bg-black/20 text-galaxy-muted hover:text-galaxy-text"
                        on:click={() => openEdit(t)}
                      >
                        Edit
                      </button>

                      <button
                        class="text-xs px-3 py-2 rounded-xl bg-black/20 text-galaxy-muted hover:text-red-300"
                        on:click={() => removeTodo(t)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  class={`px-4 pb-4 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  style={`max-height: ${isOpen ? DETAILS_H : 0}px;`}
                >
                  <div class="rounded-xl border border-galaxy-border bg-galaxy-void p-3">
                    <p class="text-xs text-galaxy-muted mb-1">Details</p>

                    {#if t.details && t.details.trim().length > 0}
                      <p class="text-sm text-galaxy-text whitespace-pre-wrap break-words">
                        {t.details}
                      </p>
                    {:else}
                      <p class="text-sm text-galaxy-subtle italic">No details yet.</p>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* IMPORTANT: set these to match your theme */
  :global(:root) {
    --tab-bg: #141a2e;      /* galaxy-card */
    --tab-border: #1e2642;  /* galaxy-border */
    --tab-text: #f8faff;    /* galaxy-text */
    --tab-muted: #b6bdd6;   /* galaxy-muted */
    --behind-tabs: rgba(0, 0, 0, 0.10); /* what sits behind inactive tabs */
  }

  .tabsbar {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    overflow-x: auto;
    margin-bottom: -1px; /* fuse with panel border */
    padding-bottom: 0;
  }

  .panel {
    position: relative;
    z-index: 1;
  }

.tabbtn {
  position: relative;
  white-space: nowrap;
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 1rem 1rem 0 0;
  border: 1px solid var(--tab-border);

  /* DO NOT transition "all" */
  transition:
    background-color 240ms cubic-bezier(.2,.8,.2,1),
    color 240ms cubic-bezier(.2,.8,.2,1),
    border-color 240ms cubic-bezier(.2,.8,.2,1),
    box-shadow 240ms cubic-bezier(.2,.8,.2,1);
}


 /* Pseudos exist always (no pop-in creation) */
.tabbtn::before,
.tabbtn::after {
  content: '';
  position: absolute;
  bottom: -1px;
  width: 16px;
  height: 16px;
  background: transparent;
  pointer-events: none;

  opacity: 0;
  transform: translateY(6px) scale(0.95);

  /* default = exit animation (no delay) */
  transition:
    opacity 180ms cubic-bezier(.2,.8,.2,1),
    transform 180ms cubic-bezier(.2,.8,.2,1);
}

/* LEFT shoulder */
.tabbtn::before {
  left: -16px;
  border-bottom-right-radius: 16px;
  box-shadow: 8px 8px 0 8px var(--tab-bg);
  border-right: 1px solid var(--tab-border);
}

/* RIGHT shoulder */
.tabbtn::after {
  right: -16px;
  border-bottom-left-radius: 16px;
  box-shadow: -8px 8px 0 8px var(--tab-bg);
  border-left: 1px solid var(--tab-border);
}

/* Active tab */
.tabbtn--active {
  background: var(--tab-bg);
  color: var(--tab-text);
  border-bottom-color: var(--tab-bg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 5;
}

/* Enter: slightly delayed so it syncs with the fill transition */
.tabbtn--active::before,
.tabbtn--active::after {
  opacity: 1;
  transform: translateY(0) scale(1);

  transition-delay: 45ms;
  transition-duration: 220ms;
}

/* Exit: NO delay (prevents lingering) */
.tabbtn--inactive::before,
.tabbtn--inactive::after {
  transition-delay: 0ms;
}
/* Pseudos exist always (no pop-in creation) */
.tabbtn::before,
.tabbtn::after {
  content: '';
  position: absolute;
  bottom: -1px;
  width: 16px;
  height: 16px;
  background: transparent;
  pointer-events: none;

  opacity: 0;
  transform: translateY(6px) scale(0.95);

  /* default = exit animation (no delay) */
  transition:
    opacity 180ms cubic-bezier(.2,.8,.2,1),
    transform 180ms cubic-bezier(.2,.8,.2,1);
}

/* LEFT shoulder */
.tabbtn::before {
  left: -16px;
  border-bottom-right-radius: 16px;
  box-shadow: 8px 8px 0 8px var(--tab-bg);
  border-right: 1px solid var(--tab-border);
}

/* RIGHT shoulder */
.tabbtn::after {
  right: -16px;
  border-bottom-left-radius: 16px;
  box-shadow: -8px 8px 0 8px var(--tab-bg);
  border-left: 1px solid var(--tab-border);
}

/* Active tab */
.tabbtn--active {
  background: var(--tab-bg);
  color: var(--tab-text);
  border-bottom-color: var(--tab-bg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 5;
}

/* Enter: slightly delayed so it syncs with the fill transition */
.tabbtn--active::before,
.tabbtn--active::after {
  opacity: 1;
  transform: translateY(0) scale(1);

  transition-delay: 45ms;
  transition-duration: 220ms;
}

/* Exit: NO delay (prevents lingering) */
.tabbtn--inactive::before,
.tabbtn--inactive::after {
  transition-delay: 0ms;
}

</style>
