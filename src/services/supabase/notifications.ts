import { supabase } from '@/config/supabase'
import { BaseService } from './base'
import type { Notification } from './types'
import logger from '@/utils/logger'

class NotificationService extends BaseService<Notification> {
  protected tableName = 'notifications'

  async create(notificationData: Omit<Notification, 'id' | 'created_at' | 'updated_at' | 'read' | 'read_at'>): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          ...notificationData,
          read: false,
          action_url: notificationData.action_url ?? null
        }])
        .select()
        .single()

      if (error) throw error

      logger.info('Notification created successfully', { id: data.id })
      return data
    } catch (error) {
      logger.error('Failed to create notification', error)
      throw error
    }
  }

  async getByUserId(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)

      if (unreadOnly) {
        query = query.eq('read', false)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('Failed to fetch notifications', error)
      throw error
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) throw error
      
      logger.info('Notification marked as read', { notificationId })
    } catch (error) {
      logger.error('Failed to mark notification as read', error)
      throw error
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
      
      logger.info('All notifications marked as read', { userId })
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error)
      throw error
    }
  }
}

export const notificationService = new NotificationService()