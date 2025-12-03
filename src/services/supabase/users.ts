import { BaseService } from './base'
import type { UserProfile } from './types'
import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'

class UserService extends BaseService<UserProfile> {
  protected tableName = 'users'

  async create(userData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    return super.create(userData)
  }

  override async getByUserId(user_id: string): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user_id)

      if (error && error.code !== 'PGRST116') throw error
      return data || []
    } catch (error) {
      logger.error('Failed to get user by user_id', error)
      throw error
    }
  }

  async getProfileByUserId(user_id: string): Promise<UserProfile | null> {
    const profiles = await this.getByUserId(user_id)
    return profiles[0] || null
  }

  async getById(id: string): Promise<UserProfile | null> {
    return super.getById(id)
  }

  async update(id: string, updates: Partial<UserProfile>): Promise<void> {
    return super.update(id, updates)
  }

  async updateStats(userId: string, stats: Partial<UserProfile['stats']>): Promise<void> {
    try {
      const user = await this.getProfileByUserId(userId)
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
  }

  async updatePreferences(userId: string, preferences: Partial<UserProfile['preferences']>): Promise<void> {
    try {
      const user = await this.getProfileByUserId(userId)
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

export const userService = new UserService()