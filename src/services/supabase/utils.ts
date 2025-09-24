import { userService } from './users'
import { propertyService } from './properties'
import { declarationService } from './declarations'
import { revenueService } from './revenues'
import { expenseService } from './expenses'
import { notificationService } from './notifications'
import type { UserProfile, DashboardData, DashboardStats } from './types'
import logger from '@/utils/logger'

const ensureNumber = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

/**
 * Initialize user profile if it doesn't exist
 */
export async function initializeUserProfile(
  user_id: string, 
  email: string, 
  displayName: string
): Promise<UserProfile> {
  try {
    const existingProfile = await userService.getByUserId(user_id)
    
    if (existingProfile) {
      return existingProfile
    }

    const [firstName, ...lastNameParts] = displayName.split(' ')
    const lastName = lastNameParts.join(' ')

    const newProfile = await userService.create({
      user_id,
      email,
      display_name: displayName,
      first_name: firstName || '',
      last_name: lastName || '',
      subscription: 'free',
      preferences: {
        notifications: true,
        newsletter: true,
        two_factor_auth: false,
        theme: 'light'
      },
      stats: {
        properties_count: 0,
        total_revenue: 0,
        total_expenses: 0,
        declarations_count: 0
      }
    })

    logger.info('User profile initialized successfully', { user_id, email })
    return newProfile
  } catch (error) {
    logger.error('Failed to initialize user profile', error)
    throw error
  }
}

/**
 * Get all dashboard data for a user
 */
export async function getUserDashboardData(userId: string): Promise<DashboardData> {
  try {
    const [properties, declarations, revenues, expenses, notifications] = await Promise.all([
      propertyService.getByUserId(userId),
      declarationService.getByUserId(userId),
      revenueService.getByUserId(userId),
      expenseService.getByUserId(userId),
      notificationService.getByUserId(userId, true)
    ])

    const totalRevenue = revenues.reduce((sum, revenue) => sum + ensureNumber(revenue.amount), 0)
    const totalExpenses = expenses.reduce((sum, expense) => sum + ensureNumber(expense.amount), 0)
    const netProfit = totalRevenue - totalExpenses

    const stats: DashboardStats = {
      propertiesCount: properties.length,
      totalRevenue,
      totalExpenses,
      netProfit,
      unreadNotifications: notifications.length
    }

    const dashboardData: DashboardData = {
      stats,
      declarations: declarations.slice(0, 3),
      notifications: notifications.slice(0, 5),
      recentRevenues: revenues.slice(0, 5),
      recentExpenses: expenses.slice(0, 5)
    }

    // Update user stats
    try {
      await userService.updateStats(userId, {
        properties_count: properties.length,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        declarations_count: declarations.length
      })
    } catch (error) {
      logger.warn('Failed to update user stats:', error)
    }

    return dashboardData
  } catch (error) {
    logger.error('Error loading dashboard data:', error)
    
    return {
      stats: {
        propertiesCount: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        unreadNotifications: 0
      },
      declarations: [],
      notifications: [],
      recentRevenues: [],
      recentExpenses: []
    }
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

/**
 * Format dates for display
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR')
}