import { supabase } from '$lib/supabaseClient'

export async function uploadProfileImage(file: File, type: 'avatar' | 'banner') {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not logged in')

  const ext = file.name.split('.').pop() || 'png'
  const path = `${user.id}/${type}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('profile-media')
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600'
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('profile-media').getPublicUrl(path)
  return data.publicUrl
}
