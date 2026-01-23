<script lang="ts">
  import { onDestroy } from 'svelte'

  let previewUrl: string | null = null
  let livePreviewUrl: string | null = null
  export let open = false
  export let title = 'Change image'
  export let placeholder = 'https://...'
  export let saving = false
  export let errorMsg = ''
  export let variant: 'banner' | 'avatar' = 'banner'

  // Optional: show preview of current image
  export let currentUrl: string | null = null

  // Controlled input values (parent owns the state)
  export let urlInput = ''
  export let file: File | null = null

  // Events to parent
  export let onClose: () => void
  export let onSaveUrl: () => void
  export let onUploadFile: () => void

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    file = input.files?.[0] ?? null
  }

  // Create live preview for uploaded file
$: {
  if (file) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = URL.createObjectURL(file)
  } else {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      previewUrl = null
    }
  }
}

// Decide which image to preview
$: livePreviewUrl =
  previewUrl ??
  (urlInput && urlInput.startsWith('http') ? urlInput : null) ??
  currentUrl

// Optional reset handler
  export let onReset: (() => void) | null = null
  
  onDestroy(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  })
</script>

{#if open}
  <div class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/50" on:click={onClose}></div>

    <div class="relative min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-lg bg-white rounded-2xl p-6">
        <div class="flex items-start justify-between">
          <h2 class="text-xl font-bold">{title}</h2>
          <button class="text-gray-500 hover:text-black" on:click={onClose}>✕</button>
        </div>

        {#if livePreviewUrl}
  <div class="mt-4">
    <p class="text-sm text-gray-600 mb-2">Preview</p>

    <div class="flex justify-center">
      <img
        src={livePreviewUrl}
        alt="preview"
        class={
  variant === 'avatar'
    ? 'w-28 h-28 rounded-full object-cover border'
    : 'w-full max-w-md h-24 sm:h-28 rounded-xl object-cover border'
}
      />
    </div>
  </div>
{/if}

        <p class="text-sm text-gray-600 mt-4">Option 1: Paste image URL</p>
        <input
          class="mt-2 w-full border rounded-lg p-2"
          placeholder={placeholder}
          bind:value={urlInput}
        />

        <div class="mt-3 flex justify-end gap-2">
          <button class="px-4 py-2 rounded-lg" on:click={onClose}>Cancel</button>
          <button
            class="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
            disabled={saving || !urlInput}
            on:click={onSaveUrl}
          >
            {saving ? 'Saving...' : 'Save URL'}
          </button>
        </div>

        <hr class="my-5" />

        <p class="text-sm text-gray-600">Option 2: Upload image</p>
        <input type="file" accept="image/*" class="mt-2 w-full" on:change={handleFileChange} />

        <div class="mt-3 flex justify-end">
          <button
            class="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
            disabled={saving || !file}
            on:click={onUploadFile}
          >
            {saving ? 'Uploading...' : 'Upload & Use'}
          </button>
        </div>
        {#if onReset}
  <button
    class="px-3 py-2 rounded-lg border border-galaxy-border text-galaxy-muted hover:text-galaxy-text"
    disabled={saving}
    on:click={onReset}
  >
    Remove (use default)
  </button>
{/if}

        {#if errorMsg}
          <p class="mt-3 text-sm text-red-600">{errorMsg}</p>
        {/if}
      </div>
    </div>
  </div>
{/if}
