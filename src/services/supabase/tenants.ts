import { supabase } from '@/config/supabase'
import { BaseService } from './base'
import type { Tenant } from './types'
import logger from '@/utils/logger'

class TenantService extends BaseService<Tenant> {
  protected tableName = 'tenants'

  async create(tenantData: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<Tenant> {
    return super.create(tenantData)
  }

  async getById(id: string): Promise<Tenant | null> {
    return super.getById(id)
  }

  async getByUserId(userId: string): Promise<Tenant[]> {
    return super.getByUserId(userId)
  }

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
  }

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
  }

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

  async update(id: string, updates: Partial<Tenant>): Promise<void> {
    return super.update(id, updates)
  }

  async delete(id: string): Promise<void> {
    return super.delete(id)
  }
}

export const tenantService = new TenantService()