import React, { useState, useEffect, useCallback } from 'react';
import { Euro, ToggleLeft, ToggleRight, Edit, Plus, Trash2 } from 'lucide-react';
import { PropertyContextGuard } from './PropertyContextGuard';
import { usePropertyContext } from '@/hooks/usePropertyContext';
import { useAuth } from '@/hooks/useAuth';
import { revenueService } from '@/services/supabase/revenues';
import { propertyService } from '@/services/supabase/properties';
import type { Revenue } from '@/services/supabase/types';
import logger from '@/utils/logger';

const ensureNumber = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

interface NewRevenueState {
  amount: number;
  date: string;
  description: string;
  type: Revenue['type'];
}

export function RecettesPage() {
  const { user } = useAuth();
  const {
    currentPropertyId,
    injectPropertyId,
    canCreate,
    errors,
    currentProperty,
    setCurrentProperty,
    clearCurrentProperty,
  } = usePropertyContext();
  const [mode, setMode] = useState<'simple' | 'fec'>('fec');
  const [showHelp, setShowHelp] = useState(false);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRevenue, setNewRevenue] = useState<NewRevenueState>({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: 'Loyers encaissés',
    type: 'rent' as const
  });

  const loadData = useCallback(async () => {
    if (!user || !currentPropertyId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Charger seulement les données du bien sélectionné
      const [propertyData, revenuesData] = await Promise.all([
        propertyService.getById(currentPropertyId),
        revenueService.getByPropertyId(currentPropertyId)
      ]);

      setRevenues(revenuesData);
      if (propertyData) {
        setCurrentProperty(propertyData);
      } else {
        clearCurrentProperty();
      }
      logger.info('Recettes data loaded successfully', {
        property: propertyData ? 1 : 0,
        revenues: revenuesData.length
      });
    } catch (error) {
      logger.error('Error loading recettes data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [user, currentPropertyId, setCurrentProperty, clearCurrentProperty]);

  useEffect(() => {
    if (user && currentPropertyId) {
      void loadData();
    }
  }, [user, currentPropertyId, loadData]);

  const getPropertyRevenue = (propertyId: string) => {
    return revenues
      .filter(revenue => revenue.property_id === propertyId)
      .reduce((sum, revenue) => sum + ensureNumber(revenue.amount), 0);
  };

  const handleEditRevenue = (propertyId: string) => {
    setEditingProperty(propertyId);
    setEditAmount(getPropertyRevenue(propertyId).toString());
  };

  const handleSaveRevenue = async (propertyId: string) => {
    if (!user) return;
    
    try {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount < 0) {
        setError('Veuillez saisir un montant valide');
        return;
      }

      setError(null);

      // Supprimer les anciens revenus pour cette propriété
      const existingRevenues = revenues.filter(r => r.property_id === propertyId);
      for (const revenue of existingRevenues) {
        await revenueService.delete(revenue.id);
      }

      // Créer le nouveau revenu si le montant est supérieur à 0
      if (amount > 0) {
        await revenueService.create({
          user_id: user.uid,
          property_id: propertyId,
          amount,
          date: new Date().toISOString().split('T')[0],
          description: 'Loyers encaissés',
          type: 'rent'
        });
      }

      setEditingProperty(null);
      setEditAmount('');
      await loadData();
      logger.info('Revenue saved successfully', { propertyId, amount });
    } catch (error) {
      logger.error('Error saving revenue:', error);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleCancelEdit = () => {
    setEditingProperty(null);
    setEditAmount('');
    setError(null);
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canCreate) return;

    if (newRevenue.amount <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    try {
      setError(null);
      const revenueData = injectPropertyId({
        user_id: user.uid,
        amount: newRevenue.amount,
        date: newRevenue.date,
        description: newRevenue.description,
        type: newRevenue.type
      });
      
      await revenueService.create(revenueData);

      setNewRevenue({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: 'Loyers encaissés',
        type: 'rent'
      });
      setShowAddForm(false);
      await loadData();
      logger.info('New revenue added successfully');
    } catch (error) {
      logger.error('Error adding revenue:', error);
      setError('Erreur lors de l\'ajout du revenu');
    }
  };

  const handleDeleteRevenue = async (revenueId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce revenu ?')) return;
    
    try {
      setError(null);
      await revenueService.delete(revenueId);
      await loadData();
      logger.info('Revenue deleted successfully', { revenueId });
    } catch (error) {
      logger.error('Error deleting revenue:', error);
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <PropertyContextGuard 
      requireProperty={true}
      fallbackMessage="Sélectionnez un bien pour gérer ses recettes"
    >
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Recettes</h1>
          <p className="text-gray-600">Suivez vos revenus locatifs</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            disabled={!canCreate}
            onClick={() => setShowAddForm(true)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              canCreate 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter un revenu</span>
          </button>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
            <span className={`text-sm ${mode === 'simple' ? 'font-medium text-blue-600' : 'text-gray-600'}`}>
              Mode Simple
            </span>
            <button onClick={() => setMode(mode === 'simple' ? 'fec' : 'simple')}>
              {mode === 'simple' ? (
                <ToggleRight className="h-5 w-5 text-blue-600" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <span className={`text-sm ${mode === 'fec' ? 'font-medium text-blue-600' : 'text-gray-600'}`}>
              Mode FEC
            </span>
          </div>
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Centre d'aide
          </button>
        </div>
      </div>

      {!canCreate && (
        <div className="mb-4 p-4 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
          {errors.cannotCreate}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ajouter un revenu</h2>
          <form onSubmit={handleAddRevenue} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newRevenue.amount}
                  onChange={(e) => setNewRevenue({ ...newRevenue, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={newRevenue.date}
                  onChange={(e) => setNewRevenue({ ...newRevenue, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={newRevenue.type}
                  onChange={(e) => setNewRevenue({ ...newRevenue, type: e.target.value as 'rent' | 'charges' | 'other' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="rent">Loyer</option>
                  <option value="charges">Charges</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newRevenue.description}
                  onChange={(e) => setNewRevenue({ ...newRevenue, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Loyers encaissés"
                  required
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ajouter le revenu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Aide contextuelle */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Euro className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Qu'est ce que les loyers bruts encaissés ?
              </h3>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li>• On entend par "loyers bruts" la somme des loyers encaissés au cours de l'année ainsi que que toutes les provisions pour charges que le locataire a versé au cours de l'année.</li>
                <li>• Pour ne rien oublier, nous vous recommandons de faire la somme de tous les versements reçus de la part du locataire au cours de l'année (hors dépôt de garantie).</li>
                <li>• Par exemple, si votre locataire vous verse 1000€ par mois, vous devez indiquer 12 000€ dans la case "Loyers bruts encaissés".</li>
              </ul>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                Fermer l'aide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des revenus détaillés */}
      {revenues.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Revenus détaillés</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Propriété</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Montant</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {revenues.map((revenue) => {
                  return (
                    <tr key={revenue.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(revenue.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {currentProperty?.address || 'Propriété sélectionnée'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{revenue.description}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          revenue.type === 'rent' ? 'bg-green-100 text-green-800' :
                          revenue.type === 'charges' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {revenue.type === 'rent' ? 'Loyer' :
                           revenue.type === 'charges' ? 'Charges' : 'Autre'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">
                        {revenue.amount.toLocaleString()} €
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteRevenue(revenue.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tableau des recettes par bien */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recettes par bien</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Adresse du bien</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Recettes</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Charges</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Intérêts d'emprunt</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Amortissement</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Statut</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement...</p>
                  </td>
                </tr>
              ) : !currentProperty ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                    Aucun bien sélectionné
                  </td>
                </tr>
              ) : (
                (() => {
                  const revenue = getPropertyRevenue(currentProperty.id);
                  const isEditing = editingProperty === currentProperty.id;

                  return (
                    <tr key={currentProperty.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {currentProperty.address}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-600">€</span>
                            <button
                              onClick={() => handleSaveRevenue(currentProperty.id)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-green-600">
                            {revenue.toLocaleString()} €
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">-0 €</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">-0 €</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">-</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          revenue > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {revenue > 0 ? 'Complet' : 'À compléter'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditRevenue(currentProperty.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Modifier les recettes"
                          disabled={isEditing}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </PropertyContextGuard>
  );
}