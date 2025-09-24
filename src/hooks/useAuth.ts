import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? mapUser(session.user) : null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ? mapUser(session.user) : null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const mapUser = (user: User): AuthUser => ({
    uid: user.id,
    email: user.email || null,
    displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || null,
    photoURL: user.user_metadata?.avatar_url || null
  })

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          },
          emailRedirectTo: undefined
          }
      })

      if (error) throw error
      return data.user
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message)
      throw err
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return data.user
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message)
      throw err
    }
  }

  const logout = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message)
      throw err
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message)
      throw err
    }
  }

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    logout,
    resetPassword
  }
}
