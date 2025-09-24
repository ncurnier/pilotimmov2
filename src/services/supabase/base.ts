import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'

/**
 * Base service class with common CRUD operations
 */
export abstract class BaseService<T extends { id: string }> {
  protected abstract tableName: string

  protected async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert([data])
        .select()
        .single()

      if (error) throw error
      
      logger.info(`${this.tableName} created successfully`, { id: result.id })
      return result
    } catch (error) {
      logger.error(`Failed to create ${this.tableName}`, error)
      throw error
    }
  }

  protected async getById(id: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    } catch (error) {
      logger.error(`Failed to get ${this.tableName} by ID`, error)
      throw error
    }
  }

  protected async update(id: string, updates: Partial<T>): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      logger.info(`${this.tableName} updated successfully`, { id })
    } catch (error) {
      logger.error(`Failed to update ${this.tableName}`, error)
      throw error
    }
  }

  protected async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) throw error
      
      logger.info(`${this.tableName} deleted successfully`, { id })
    } catch (error) {
      logger.error(`Failed to delete ${this.tableName}`, error)
      throw error
    }
  }

  protected async getByUserId(userId: string): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error(`Failed to get ${this.tableName} by user ID`, error)
      throw error
    }
  }
}