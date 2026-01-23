import { supabase } from '$lib/supabaseClient'

export async function ensureProfileRow() {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return

  // If row exists, do nothing
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('ensureProfileRow select error:', error)
    return
  }

  // Otherwise create it
  if (!data) {
    const { error: insertError } = await supabase.from('profiles').insert({ id: user.id })
    if (insertError) console.error('ensureProfileRow insert error:', insertError)
  }
}
