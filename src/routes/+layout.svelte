<script lang="ts">
      import BGBackground from '$lib/components/BGBackground.svelte'
  import favicon from '$lib/assets/favicon.svg'
  import { supabase } from '$lib/supabaseClient'
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { ensureProfileRow } from '$lib/profile'
  import '../app.css'

  let { children } = $props()
  let session: any = null

  async function ensureProfileSafe() {
    try {
      await ensureProfileRow()
    } catch (e) {
      console.error('ensureProfileRow failed:', e)
    }
  }

  onMount(async () => {
    // Get current session on load
    const { data } = await supabase.auth.getSession()
    session = data.session

    // Redirect rule:
    // - if logged in and currently at "/" -> go home
    if (session && $page.url.pathname === '/') {
      ensureProfileSafe() // fire and forget
      goto('/home')
    }

    // Listen for auth changes (magic link sign-in happens here)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      session = newSession

      if (newSession) {
        ensureProfileSafe()
        if ($page.url.pathname === '/') goto('/home')
      } else {
        if ($page.url.pathname !== '/') goto('/')
      }
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  })
</script>
  <BGBackground />
<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen w-full">
  <div
    class="
      mx-auto
      w-full
      max-w-7xl
      px-4 sm:px-6 lg:px-8
      grid grid-cols-12 gap-4
    "
  >
    {@render children()}
  </div>
</div>
