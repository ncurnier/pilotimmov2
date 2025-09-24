import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getUserDashboardData, initializeUserProfile } from '../services/supabase/utils'
import { userService } from '../services/supabase/users'
import { notificationService } from '../services/supabase/notifications'
import type { UserProfile, Notification, DashboardData } from '../services/supabase/types'
import logger from '../utils/logger'

export function useSupabase() {
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setUserProfile(null)
    setNotifications([])
    setDashboardData(null)
    setLoading(false)
    setError(null)
  }, [])

  const loadUserData = useCallback(async () => {
    if (!user) return

    try {
      const [profile, unreadNotifications, dashboard] = await Promise.all([
        userService.getByUserId(user.uid),
        notificationService.getByUserId(user.uid, true),
        getUserDashboardData(user.uid)
      ])

      setUserProfile(profile)
      setNotifications(unreadNotifications)
      setDashboardData(dashboard)
    } catch (err) {
      logger.error('Error loading user data:', err)
      setError('Erreur lors du chargement des données')
    }
  }, [user])

  const initializeUser = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Initialiser le profil utilisateur s'il n'existe pas
      await initializeUserProfile(
        user.uid, 
        user.email || '', 
        user.displayName || 'Utilisateur'
      )

      // Charger les données utilisateur
      await loadUserData()
    } catch (err) {
      logger.error('Error initializing user:', err)
      setError('Erreur lors de l\'initialisation du profil utilisateur')
    } finally {
      setLoading(false)
    }
  }, [user, loadUserData])

  const refreshData = useCallback(async () => {
    if (user) {
      setError(null)
      try {
        await loadUserData()
      } catch (err) {
        logger.error('Error refreshing data:', err)
        setError('Erreur lors du rafraîchissement des données')
      }
    }
  }, [user, loadUserData])

  // Initialiser le profil utilisateur quand l'utilisateur se connecte
  useEffect(() => {
    if (user) {
      void initializeUser()
    } else {
      resetState()
    }
  }, [user, initializeUser, resetState])

  // Auto-refresh des données toutes les 5 minutes
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        void refreshData()
      }, 2 * 60 * 1000) // 2 minutes pour un meilleur suivi

      return () => clearInterval(interval)
    }
    return undefined
  }, [user, refreshData])

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      )
      
      // Mettre à jour le compteur dans les données du dashboard
      if (dashboardData) {
        setDashboardData(prev => prev ? {
          ...prev,
          stats: {
            ...prev.stats,
            unreadNotifications: Math.max(0, prev.stats.unreadNotifications - 1)
          }
        } : null)
      }
    } catch (err) {
      logger.error('Error marking notification as read:', err)
      setError('Erreur lors de la mise à jour de la notification')
    }
  }

  const markAllNotificationsAsRead = async () => {
    if (!user) return
    
    try {
      await notificationService.markAllAsRead(user.uid)
      setNotifications([])
      
      // Mettre à jour le compteur dans les données du dashboard
      if (dashboardData) {
        setDashboardData(prev => prev ? {
          ...prev,
          stats: {
            ...prev.stats,
            unreadNotifications: 0
          }
        } : null)
      }
    } catch (err) {
      logger.error('Error marking all notifications as read:', err)
      setError('Erreur lors de la mise à jour des notifications')
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!userProfile) return
    
    try {
      await userService.update(userProfile.id, updates)
      setUserProfile(prev => prev ? { ...prev, ...updates } : null)
    } catch (err) {
      logger.error('Error updating user profile:', err)
      setError('Erreur lors de la mise à jour du profil')
    }
  }

  const updateUserPreferences = async (preferences: Partial<UserProfile['preferences']>) => {
    if (!user) return
    
    try {
      await userService.updatePreferences(user.uid, preferences)
      setUserProfile(prev => prev ? {
        ...prev,
        preferences: { ...prev.preferences, ...preferences }
      } : null)
    } catch (err) {
      logger.error('Error updating user preferences:', err)
      setError('Erreur lors de la mise à jour des préférences')
    }
  }

  return {
    userProfile,
    notifications,
    dashboardData,
    loading,
    error,
    refreshData,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateUserProfile,
    updateUserPreferences
  }
}