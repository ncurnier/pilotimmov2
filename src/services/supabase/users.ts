import { supabase } from '../../config/supabase'
import type { UserProfile } from './types'
import logger from '../../utils/logger'

export const userService = {
  async create(userData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()

      if (error) throw error
      
      logger.info('User created successfully', { user_id: userData.user_id })
      return data
    } catch (error) {
      logger.error('Failed to create user', error)
      throw error
    }
  },

  async getByUserId(user_id: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    } catch (error) {
      logger.error('Failed to get user by user_id', error)
      throw error
    }
  },

  async getById(id: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    } catch (error) {
      logger.error('Failed to get user by ID', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      logger.info('User updated successfully', { id })
    } catch (error) {
      logger.error('Failed to update user', error)
      throw error
    }
  },

  async updateStats(userId: string, stats: Partial<UserProfile['stats']>): Promise<void> {
    try {
      const user = await this.getByUserId(userId)
      if (!user) throw new Error('User not found')

      const updatedStats = { ...user.stats, ...stats }

      const { error } = await supabase
        .from('users')
        .update({ 
          stats: updatedStats,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      
      logger.info('User stats updated successfully', { userId, stats: updatedStats })
    } catch (error) {
      logger.error('Failed to update user stats', error)
      throw error
    }
  },

  async updatePreferences(userId: string, preferences: Partial<UserProfile['preferences']>): Promise<void> {
    try {
      const user = await this.getByUserId(userId)
      if (!user) throw new Error('User not found')

      const updatedPreferences = { ...user.preferences, ...preferences }

      const { error } = await supabase
        .from('users')
        .update({ 
          preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      
      logger.info('User preferences updated successfully', { userId })
    } catch (error) {
      logger.error('Failed to update user preferences', error)
      throw error
    }
  }
}