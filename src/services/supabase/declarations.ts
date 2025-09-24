import { BaseService } from './base'
import type { Declaration } from './types'

class DeclarationService extends BaseService<Declaration> {
  protected tableName = 'declarations'

  async create(declarationData: Omit<Declaration, 'id' | 'created_at' | 'updated_at'>): Promise<Declaration> {
    return super.create(declarationData)
  }

  async getById(id: string): Promise<Declaration | null> {
    return super.getById(id)
  }

  async getByUserId(userId: string): Promise<Declaration[]> {
    return super.getByUserId(userId)
  }

  async update(id: string, updates: Partial<Declaration>): Promise<void> {
    return super.update(id, updates)
  }

  async delete(id: string): Promise<void> {
    return super.delete(id)
  }
}

export const declarationService = new DeclarationService()