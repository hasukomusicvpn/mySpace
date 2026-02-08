<script lang="ts">
  export let open = false
  export let saving = false
  export let errorMsg = ''

  // controlled values from parent
  export let title = ''
  export let dueDate = '' // YYYY-MM-DD
  export let details = ''

  export let onClose: () => void
  export let onSave: () => void

  function prettyDate(iso: string) {
    if (!iso) return ''
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  function openDatePicker() {
    const el = document.getElementById('editDueDatePicker') as HTMLInputElement | null
    if (!el) return
    // @ts-ignore
    if (typeof el.showPicker === 'function') el.showPicker()
    else {
      el.focus()
      el.click()
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/60" on:click={onClose}></div>

    <div class="relative min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-xl rounded-2xl border border-galaxy-border bg-galaxy-card p-6 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs text-galaxy-muted">Edit task</p>
            <h2 class="text-xl font-bold text-galaxy-text">Update task</h2>
            <p class="mt-1 text-xs text-galaxy-subtle">
              <span class="text-red-300">*</span> = required
            </p>
          </div>

          <button
            class="rounded-xl bg-black/20 px-3 py-2 text-galaxy-muted hover:text-galaxy-text"
            on:click={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {#if errorMsg}
          <p class="mt-3 text-sm text-red-400">{errorMsg}</p>
        {/if}

        <div class="mt-5 space-y-4">
          <!-- title -->
          <div>
            <label class="block text-xs text-galaxy-muted mb-1">
              Task name <span class="text-red-300">*</span>
            </label>
            <input
              class="w-full rounded-xl bg-galaxy-void border border-galaxy-border px-4 py-3 text-galaxy-text outline-none placeholder:text-galaxy-subtle"
              placeholder="e.g. Finish math homework"
              bind:value={title}
            />
          </div>

          <!-- due date -->
          <div>
            <label class="block text-xs text-galaxy-muted mb-1">
              Due date <span class="text-red-300">*</span>
            </label>

            <div class="relative">
              <input
                id="editDueDatePicker"
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

            {#if dueDate}
              <p class="mt-1 text-xs text-galaxy-subtle">
                Selected: <span class="text-galaxy-text/90">{prettyDate(dueDate)}</span>
              </p>
            {/if}
          </div>

          <!-- details -->
          <div>
            <label class="block text-xs text-galaxy-muted mb-1">Details</label>
            <textarea
              class="w-full min-h-[160px] resize-y rounded-xl bg-galaxy-void border border-galaxy-border p-3 text-sm text-galaxy-text outline-none placeholder:text-galaxy-subtle"
              placeholder="Links, steps, notes… (only editable here)"
              bind:value={details}
            ></textarea>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-2">
          <button
            class="rounded-xl bg-black/20 px-4 py-2 text-galaxy-muted hover:text-galaxy-text"
            on:click={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            class="rounded-xl bg-galaxy-blue px-4 py-2 text-white font-semibold hover:brightness-110 disabled:opacity-60"
            on:click={onSave}
            disabled={saving || !title.trim() || !dueDate}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
