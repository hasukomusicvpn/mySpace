<script lang="ts">
  import { supabase } from '$lib/supabaseClient'
  import { onMount } from 'svelte'


  let email = ''
  let status = ''
  let sending = false

  onMount(async () => {
    // If already logged in, +layout will redirect, but this avoids confusion.
    const { data } = await supabase.auth.getSession()
    if (data.session) status = 'You are already logged in. Redirecting...'
  })

  async function loginWithEmail() {
    status = ''
    sending = true

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // redirect back to your site after clicking the email link
        emailRedirectTo: window.location.origin
      }
    })

    sending = false

    if (error) {
      console.error(error)
      status = error.message
    } else {
      status = 'Check your email for the login link.'
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-6">
  <div class="w-full max-w-md bg-white rounded-2xl shadow p-6">
    <h1 class="text-2xl font-bold">Login</h1>
    <p class="text-gray-600 mt-2">Enter your email to receive a magic login link.</p>

    <input
      class="mt-4 w-full border rounded-lg p-2"
      type="email"
      placeholder="you@example.com"
      bind:value={email}
    />

    <button
      class="mt-4 w-full bg-black text-white rounded-lg py-2 disabled:opacity-50"
      disabled={sending || !email}
      on:click={loginWithEmail}
    >
      {sending ? 'Sending...' : 'Send login link'}
    </button>

    {#if status}
      <p class="mt-3 text-sm text-gray-700">{status}</p>
    {/if}
  </div>
</div>
