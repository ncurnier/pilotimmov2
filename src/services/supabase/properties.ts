import { BaseService } from './base'
import type { Property } from './types'

class PropertyService extends BaseService<Property> {
  protected tableName = 'properties'

  async create(propertyData: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property> {
    return super.create(propertyData)
  }

  async getById(id: string): Promise<Property | null> {
    return super.getById(id)
  }

  async getByUserId(userId: string): Promise<Property[]> {
    return super.getByUserId(userId)
  }

  async update(id: string, updates: Partial<Property>): Promise<void> {
    return super.update(id, updates)
  }

  async delete(id: string): Promise<void> {
    return super.delete(id)
  }
}

export const propertyService = new PropertyService()