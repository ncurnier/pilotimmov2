import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import { 
  FileText, 
  Home, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  BarChart3,
  Activity,
  Bell
} from 'lucide-react';
import type { Declaration, Notification } from '@/services/supabase/types';
import { formatCurrency, formatDate } from '@/services/supabase/utils';
import { propertyService } from '@/services/supabase/properties';
import { revenueService } from '@/services/supabase/revenues';
import { expenseService } from '@/services/supabase/expenses';
import logger from '@/utils/logger';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

export function Dashboard({ onPageChange }: DashboardProps) {
  const { user } = useAuth();
  const { dashboardData, loading, error } = useSupabase();
  const [selectedPeriod, setSelectedPeriod] = useState('1A');
  const [realTimeStats, setRealTimeStats] = useState({
    propertiesCount: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0
  });

  // Charger les statistiques en temps réel
  const loadRealTimeStats = useCallback(async () => {
    if (!user) return;

    try {
      const [properties, revenues, expenses] = await Promise.all([
        propertyService.getByUserId(user.uid),
        revenueService.getByUserId(user.uid),
        expenseService.getByUserId(user.uid)
      ]);

      const totalRevenue = revenues.reduce((sum, revenue) => sum + revenue.amount, 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      setRealTimeStats({
        propertiesCount: properties.length,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses
      });
    } catch (error) {
      logger.error('Error loading real-time stats:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadRealTimeStats();
      const interval = setInterval(loadRealTimeStats, 60000);
      return () => clearInterval(interval);
    }
  }, [user, loadRealTimeStats]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-bg-primary min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-text-primary">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-bg-primary min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">Erreur de chargement</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || realTimeStats;
  const declarations = dashboardData?.declarations || [];
  const notifications = dashboardData?.notifications || [];

  return (
    <div className="p-6 max-w-7xl mx-auto bg-bg-primary min-h-full">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-bg-card p-6 rounded-default shadow-card border border-border-light">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Home className="h-6 w-6 text-accent-blue" />
            </div>
            <span className="text-sm font-semibold text-accent-green bg-green-50 px-2 py-1 rounded-full">
              +12%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-accent-blue mb-1">{stats.propertiesCount}</h3>
          <p className="text-text-primary font-medium">Biens gérés</p>
          <div className="mt-2 flex items-center text-xs text-gray-600">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            <span>vs mois dernier</span>
          </div>
        </div>

        <div className="bg-bg-card p-6 rounded-default shadow-card border border-border-light">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-accent-green" />
            </div>
            <span className="text-sm font-semibold text-accent-green bg-green-50 px-2 py-1 rounded-full">
              +8%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-accent-green mb-1">
            {formatCurrency(stats.totalRevenue)}
          </h3>
          <p className="text-text-primary font-medium">Recettes 2025</p>
          <div className="mt-2 flex items-center text-xs text-gray-600">
            <Target className="h-3 w-3 mr-1" />
            <span>Objectif: {formatCurrency(25000)}</span>
          </div>
        </div>

        <div className="bg-bg-card p-6 rounded-default shadow-card border border-border-light">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-accent-gold" />
            </div>
            <span className="text-sm font-semibold text-accent-gold bg-yellow-50 px-2 py-1 rounded-full">
              +3%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-accent-gold mb-1">
            {formatCurrency(stats.totalExpenses)}
          </h3>
          <p className="text-text-primary font-medium">Dépenses 2025</p>
          <div className="mt-2 flex items-center text-xs text-gray-600">
            <ArrowDownRight className="h-3 w-3 mr-1" />
            <span>Optimisation possible</span>
          </div>
        </div>

        <div className="bg-bg-card p-6 rounded-default shadow-card border border-border-light">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-accent-blue" />
            </div>
            <span className="text-sm font-semibold text-accent-blue bg-blue-50 px-2 py-1 rounded-full">
              {stats.totalRevenue > 0 ? Math.round((stats.netProfit / stats.totalRevenue) * 100) : 0}%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-accent-blue mb-1">
            {formatCurrency(stats.netProfit)}
          </h3>
          <p className="text-text-primary font-medium">Bénéfice net</p>
          <div className="mt-2 flex items-center text-xs text-gray-600">
            <Activity className="h-3 w-3 mr-1" />
            <span>Rentabilité {stats.netProfit > 0 ? 'excellente' : 'à améliorer'}</span>
          </div>
        </div>
      </div>

      {/* Graphiques et analyses */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-bg-card rounded-default shadow-card border border-border-light">
          <div className="p-6 border-b border-border-light">
            <div className="flex items-center justify-between">
              <h2 className="text-subtitle text-text-primary font-playfair">Évolution des revenus</h2>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setSelectedPeriod('6M')}
                  className={`text-sm px-3 py-1 rounded-lg transition-smooth ${
                    selectedPeriod === '6M' 
                      ? 'bg-accent-blue text-text-secondary' 
                      : 'text-gray-600 hover:text-accent-blue hover:bg-gray-50'
                  }`}
                >
                  6M
                </button>
                <button 
                  onClick={() => setSelectedPeriod('1A')}
                  className={`text-sm px-3 py-1 rounded-lg transition-smooth ${
                    selectedPeriod === '1A' 
                      ? 'bg-accent-blue text-text-secondary' 
                      : 'text-gray-600 hover:text-accent-blue hover:bg-gray-50'
                  }`}
                >
                  1A
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between space-x-2">
              {[65, 78, 82, 88, 95, 89, 92, 98, 85, 91, 96, 100].map((height, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-accent-blue to-accent-green rounded-t-sm transition-smooth hover:opacity-80"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-xs text-gray-600 mt-2">
                    {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-bg-card rounded-default shadow-card border border-border-light">
          <div className="p-6 border-b border-border-light">
            <h2 className="text-subtitle text-text-primary font-playfair">Répartition des revenus</h2>
          </div>
          <div className="p-6">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-8 border-accent-blue border-t-transparent transform rotate-45"></div>
              <div className="absolute inset-4 rounded-full bg-bg-card flex items-center justify-center">
                <span className="text-lg font-bold text-accent-blue">
                  {stats.totalRevenue > 0 ? Math.round((stats.netProfit / stats.totalRevenue) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-accent-blue rounded-full"></div>
                  <span className="text-sm text-text-primary">Loyers</span>
                </div>
                <span className="text-sm font-semibold text-accent-blue">
                  {stats.totalRevenue > 0 ? Math.round((stats.netProfit / stats.totalRevenue) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-accent-green rounded-full"></div>
                  <span className="text-sm text-text-primary">Charges</span>
                </div>
                <span className="text-sm font-semibold text-accent-green">
                  {stats.totalRevenue > 0 ? Math.round((stats.totalExpenses / stats.totalRevenue) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Déclarations récentes */}
        <div className="bg-bg-card rounded-default shadow-card border border-border-light">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-subtitle text-text-primary font-playfair mb-2">Déclarations récentes</h2>
                <p className="text-body text-gray-600">Suivi de vos déclarations LMNP</p>
              </div>
              <FileText className="h-8 w-8 text-accent-blue" />
            </div>
          </div>
          <div className="p-6">
            {declarations.length > 0 ? (
              declarations.slice(0, 1).map((declaration: Declaration) => (
                <div key={declaration.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-bg-card rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-8 w-8 text-accent-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-text-primary">
                          Déclaration {declaration.year + 1} des revenus {declaration.year}
                        </h3>
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                          declaration.status === 'completed' ? 'bg-green-100 text-green-800' :
                          declaration.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {declaration.status === 'completed' ? 'Terminée' :
                           declaration.status === 'in_progress' ? 'En cours' : 'Brouillon'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Dernière mise à jour le {formatDate(declaration.updated_at)}
                      </p>
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => onPageChange('declarations')}
                          className="text-sm bg-accent-blue text-text-secondary px-3 py-1 rounded-lg hover:bg-opacity-90 transition-smooth"
                        >
                          Voir la déclaration
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-text-primary mb-2">Aucune déclaration</h3>
                <p className="text-gray-600 mb-4">Commencez votre première déclaration LMNP</p>
                <button 
                  onClick={() => onPageChange('declarations')}
                  className="bg-accent-blue text-text-secondary px-4 py-2 rounded-lg hover:bg-opacity-90 transition-smooth"
                >
                  Nouvelle déclaration
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Alertes et notifications */}
        <div className="bg-bg-card rounded-default shadow-card border border-border-light">
          <div className="p-6 border-b border-border-light">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-subtitle text-text-primary font-playfair mb-2">Alertes & Notifications</h2>
                <p className="text-body text-gray-600">Échéances importantes à venir</p>
              </div>
              <div className="relative">
                <AlertTriangle className="h-8 w-8 text-accent-gold" />
                {stats.unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-text-secondary rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {stats.unreadNotifications}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {notifications.length > 0 ? (
              notifications.slice(0, 3).map((notification: Notification) => (
                <div key={notification.id} className={`flex items-start space-x-3 p-4 rounded-lg border ${
                  notification.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                  notification.type === 'success' ? 'bg-green-50 border-green-200' :
                  notification.type === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`h-5 w-5 mt-0.5 ${
                    notification.type === 'warning' ? 'text-orange-600' :
                    notification.type === 'success' ? 'text-green-600' :
                    notification.type === 'error' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {notification.type === 'warning' ? <AlertTriangle className="h-5 w-5" /> :
                     notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> :
                     notification.type === 'error' ? <AlertTriangle className="h-5 w-5" /> :
                     <Bell className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">{notification.title}</h4>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    <p className={`text-xs mt-1 ${
                      notification.type === 'warning' ? 'text-orange-600' :
                      notification.type === 'success' ? 'text-green-600' :
                      notification.type === 'error' ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-text-primary mb-2">Aucune notification</h3>
                <p className="text-gray-600">Vous êtes à jour !</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-subtitle text-text-primary font-playfair">Actions rapides</h2>
          <button className="text-sm text-accent-blue hover:text-accent-gold font-semibold transition-smooth">
            Voir tout
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => onPageChange('declarations')}
            className="bg-accent-blue text-text-secondary p-6 rounded-default hover:bg-opacity-90 transition-smooth text-left"
          >
            <FileText className="h-8 w-8 mb-3" />
            <h3 className="font-semibold mb-2">Nouvelle déclaration</h3>
            <p className="text-sm text-gray-300">Commencer une déclaration LMNP</p>
          </button>
          
          <button 
            onClick={() => onPageChange('properties')}
            className="bg-accent-green text-text-secondary p-6 rounded-default hover:bg-opacity-90 transition-smooth text-left"
          >
            <Home className="h-8 w-8 mb-3" />
            <h3 className="font-semibold mb-2">Ajouter un bien</h3>
            <p className="text-sm text-gray-300">Enregistrer une nouvelle propriété</p>
          </button>
          
          <button 
            onClick={() => onPageChange('recettes')}
            className="bg-accent-gold text-text-primary p-6 rounded-default hover:bg-opacity-90 transition-smooth text-left"
          >
            <BarChart3 className="h-8 w-8 mb-3" />
            <h3 className="font-semibold mb-2">Simuler mes revenus</h3>
            <p className="text-sm text-gray-700">Optimiser ma fiscalité</p>
          </button>

          <button 
            onClick={() => onPageChange('marketplace')}
            className="bg-gray-700 text-text-secondary p-6 rounded-default hover:bg-opacity-90 transition-smooth text-left"
          >
            <Users className="h-8 w-8 mb-3" />
            <h3 className="font-semibold mb-2">Marketplace</h3>
            <p className="text-sm text-gray-300">Trouver des experts partenaires</p>
          </button>
        </div>
      </div>

      {/* Conseils IA */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-default p-6 border border-border-light">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-bg-card rounded-lg flex items-center justify-center shadow-card">
            <span className="text-xl">🤖</span>
          </div>
          <div className="flex-1">
            <h3 className="text-subtitle text-text-primary mb-2">
              Conseil IA du jour
            </h3>
            <p className="text-text-primary mb-4">
              {stats.propertiesCount === 0 
                ? "Commencez par ajouter votre premier bien immobilier pour débuter votre gestion LMNP."
                : stats.totalRevenue === 0
                ? "N'oubliez pas d'enregistrer vos revenus locatifs pour optimiser vos déclarations."
                : "Basé sur l'analyse de vos données, vous pourriez optimiser vos déductions en regroupant certaines dépenses de maintenance."
              }
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => onPageChange('formations')}
                className="bg-accent-blue text-text-secondary px-4 py-2 rounded-lg hover:bg-opacity-90 transition-smooth text-sm font-semibold"
              >
                En savoir plus
              </button>
              <button className="text-text-primary hover:text-accent-gold px-4 py-2 rounded-lg hover:bg-bg-card transition-smooth text-sm">
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}