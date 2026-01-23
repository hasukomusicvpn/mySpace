<script lang="ts">
  import EditImage from '$lib/components/EditImage.svelte'
  import { supabase } from '$lib/supabaseClient'
  import { goto } from '$app/navigation'
  import WeeklyMoodCard from '$lib/components/WeeklyMoodCard.svelte';
  import Icon from "@iconify/svelte"
  import DailyMoodCheck from '$lib/components/DailyMoodCheck.svelte';

  // DEFAULTS
  const DEFAULT_BANNER = '/galaxy-banner.jpg'
  const DEFAULT_AVATAR = '/default-avatar.jpg'

  let bannerUrl = DEFAULT_BANNER
  let avatarUrl = DEFAULT_AVATAR
  let displayName = 'Your Student Space'

  let showBannerEditor = false
  let showAvatarEditor = false

  let bannerInput = ''
  let avatarInput = ''

  let bannerFile: File | null = null
  let avatarFile: File | null = null

  let saving = false
  let errorMsg = ''

  let moodRefresh = 0

  // RESET FUNCTIONS (USED BY MODAL)
  async function resetBannerToDefault() {
    saving = true
    errorMsg = ''

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      saving = false
      goto('/')
      return
    }

    await supabase
      .from('profiles')
      .update({ banner_url: null })
      .eq('id', session.user.id)

    bannerUrl = DEFAULT_BANNER
    bannerInput = ''
    bannerFile = null
    showBannerEditor = false
    saving = false
  }

  async function resetAvatarToDefault() {
    saving = true
    errorMsg = ''

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      saving = false
      goto('/')
      return
    }

    await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', session.user.id)

    avatarUrl = DEFAULT_AVATAR
    avatarInput = ''
    avatarFile = null
    showAvatarEditor = false
    saving = false
  }
</script>

<!-- BANNER + AVATAR WRAPPER (avatar anchored to banner, not the whole page) -->
<div class="col-span-12 relative">
  <div class="relative w-full h-52">
    <!-- banner image / background -->
    <img src={bannerUrl} alt="Banner" class="w-full h-full object-cover rounded-b-xl" />

    <button
      class="absolute top-4 right-4 bg-black/50 text-white/60 hover:bg-black/85 hover:text-white p-2 rounded-lg text-sm transition-all duration-200"
      on:click={() => (showBannerEditor = true)}
    >
      <Icon icon="mingcute:camera-fill" width="24" height="24" />
    </button>

    <!-- AVATAR + TEXT (ANCHOR USING top-full) -->
    <div
      class="
        absolute
        top-full
        left-1/2 -translate-x-1/2 -translate-y-1/2
        md:left-20 md:translate-x-0
        lg:left-24
        flex flex-col md:flex-row
        items-center md:items-end
        gap-3 md:gap-4
        text-center md:text-left
        pointer-events-auto
      "
    >
      <div class="relative">
        <img
            src={avatarUrl}
            alt="Avatar"
            role="button"
            tabindex="0"
            on:click={() => (showAvatarEditor = true)}
            on:keydown={(e) => e.key === 'Enter' && (showAvatarEditor = true)}
          class="
            w-30 h-30
            sm:w-32 sm:h-32
            md:w-36 md:h-36
            lg:w-40 lg:h-40
            rounded-full
            border-3 border-galaxy-bg
            object-cover
            bg-galaxy-bg
            hover:brightness-80
            transition-all
          "
        />

        <button
          type="button"
          class="
            absolute bottom-2 right-2
            p-2 rounded-full
            bg-black/60 text-white/70
            hover:bg-black/85 hover:text-white
            transition-all duration-200
          "
          on:click={() => (showAvatarEditor = true)}
        >
          <Icon icon="mingcute:camera-fill" width="24" height="24" /> 
        </button>
      </div>

      <div class="md:mb-3">
        <p class="text-xl font-bold text-white mb-1">Welcome back 👋</p>
        <p class="text-white/80">{displayName}</p>
      </div>
    </div>
  </div>

  <!-- Reserve space BELOW banner for the avatar overlap (this does NOT affect avatar position now) -->
  <div class="mt-30 sm:mt-32 md:mt-30 lg:mt-30">
    <DailyMoodCheck on:saved={() => (moodRefresh += 1)} />
    <WeeklyMoodCard refreshToken={moodRefresh} />
  </div>
</div>
<!-- MODALS -->
<EditImage
  variant="banner"
  open={showBannerEditor}
  title="Change banner"
  placeholder="https://example.com/banner.jpg"
  currentUrl={bannerUrl}
  saving={saving}
  errorMsg={errorMsg}
  bind:urlInput={bannerInput}
  bind:file={bannerFile}
  onReset={resetBannerToDefault}
  onClose={() => (showBannerEditor = false)}
/>

<EditImage
  variant="avatar"
  open={showAvatarEditor}
  title="Change avatar"
  placeholder="https://example.com/avatar.png"
  currentUrl={avatarUrl}
  saving={saving}
  errorMsg={errorMsg}
  bind:urlInput={avatarInput}
  bind:file={avatarFile}
  onReset={resetAvatarToDefault}
  onClose={() => (showAvatarEditor = false)}
/>
