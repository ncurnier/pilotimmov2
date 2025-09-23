import { supabase } from '../../config/supabase'
import type { Tenant } from './types'
import logger from '../../utils/logger'

export const tenantService = {
  async create(tenantData: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<Tenant> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([tenantData])
        .select()
        .single()

      if (error) throw error
      
      logger.info('Tenant created successfully', { id: data.id })
      return data
    } catch (error) {
      logger.error('Failed to create tenant', error)
      throw error
    }
  },

  async getById(id: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    } catch (error) {
      logger.error('Failed to get tenant by ID', error)
      throw error
    }
  },

  async getByUserId(userId: string): Promise<Tenant[]> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('Failed to get tenants by user ID', error)
      throw error
    }
  },

  async getByPropertyId(propertyId: string): Promise<Tenant[]> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('property_id', propertyId)
        .order('start_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('Failed to get tenants by property ID', error)
      throw error
    }
  },

  async getCurrentTenant(propertyId: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)

      if (error) throw error
      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      logger.error('Failed to get current tenant', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<Tenant>): Promise<void> {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      logger.info('Tenant updated successfully', { id })
    } catch (error) {
      logger.error('Failed to update tenant', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      logger.info('Tenant deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete tenant', error)
      throw error
    }
  },

  async endTenancy(tenantId: string, endDate: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          status: 'ended',
          end_date: endDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)

      if (error) throw error
      
      logger.info('Tenancy ended successfully', { tenantId, endDate })
    } catch (error) {
      logger.error('Failed to end tenancy', error)
      throw error
    }
  }
}