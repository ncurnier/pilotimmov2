import { userService } from './users'
import { propertyService } from './properties'
import { declarationService } from './declarations'
import { revenueService } from './revenues'
import { expenseService } from './expenses'
import { notificationService } from './notifications'
import type { UserProfile, DashboardData, DashboardStats } from './types'
import logger from '../../utils/logger'

/**
 * Initialise le profil utilisateur s'il n'existe pas déjà
 */
export async function initializeUserProfile(
  user_id: string, 
  email: string, 
  displayName: string
): Promise<UserProfile> {
  try {
    // Vérifier si le profil existe déjà
    const existingProfile = await userService.getByUserId(user_id)
    
    if (existingProfile) {
      return existingProfile
    }

    // Créer un nouveau profil utilisateur
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
 * Récupère toutes les données nécessaires pour le tableau de bord
 */
export async function getUserDashboardData(userId: string): Promise<DashboardData> {
  try {
    const [properties, declarations, revenues, expenses, notifications] = await Promise.all([
      propertyService.getByUserId(userId),
      declarationService.getByUserId(userId),
      revenueService.getByUserId(userId),
      expenseService.getByUserId(userId),
      notificationService.getByUserId(userId, true) // Seulement les non lues
    ])

    // Calculer les statistiques
    const totalRevenue = revenues.reduce((sum, revenue) => sum + revenue.amount, 0)
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const netProfit = totalRevenue - totalExpenses

    const stats: DashboardStats = {
      propertiesCount: properties.length,
      totalRevenue,
      totalExpenses,
      netProfit,
      unreadNotifications: notifications.length
    }

    // Trier et limiter les données récentes
    const recentRevenues = revenues.slice(0, 5)
    const recentExpenses = expenses.slice(0, 5)

    const dashboardData: DashboardData = {
      stats,
      declarations: declarations.slice(0, 3), // 3 déclarations les plus récentes
      notifications: notifications.slice(0, 5), // 5 notifications les plus récentes
      recentRevenues,
      recentExpenses
    }

    // Mettre à jour les statistiques utilisateur
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
    
    // Retourner des données par défaut en cas d'erreur
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
 * Formate les montants pour l'affichage
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

/**
 * Formate les dates pour l'affichage
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR')
}

