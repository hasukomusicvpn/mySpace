import { supabase } from './supabaseClient'

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  })
  if (error) console.error(error)
}

export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email
  })
  if (error) console.error(error)
}

export async function signOut() {
  await supabase.auth.signOut()
}