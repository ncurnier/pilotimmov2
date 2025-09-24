import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Edit, Trash2, Info } from 'lucide-react';
import { PropertyContextGuard } from './PropertyContextGuard';
import { usePropertyContext } from '../hooks/usePropertyContext';
import { useAuth } from '../hooks/useAuth';
import { amortizationService } from '../services/supabase/amortizations';
import { propertyService } from '../services/supabase/properties';
import type { Amortization } from '../services/supabase/types';
import logger from '../utils/logger';

const ensureNumber = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

interface AmortissementsPageProps {
  onPageChange?: (page: string) => void;
}

export function AmortissementsPage({ onPageChange }: AmortissementsPageProps) {
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
  const [amortizations, setAmortizations] = useState<Amortization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAmortization, setEditingAmortization] = useState<Amortization | null>(null);
  const [newAmortization, setNewAmortization] = useState({
    itemName: '',
    category: 'mobilier' as const,
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseAmount: 0,
    usefulLifeYears: 10,
    notes: ''
  });

  useEffect(() => {
    if (user && currentPropertyId) {
      loadData();
    }
  }, [user, currentPropertyId]);

  const loadData = async () => {
    if (!user || !currentPropertyId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Charger seulement les données du bien sélectionné
      const [amortizationsData, propertyData] = await Promise.all([
        amortizationService.getByPropertyId(currentPropertyId),
        propertyService.getById(currentPropertyId)
      ]);

      setAmortizations(amortizationsData);
      if (propertyData) {
        setCurrentProperty(propertyData);
      } else {
        clearCurrentProperty();
      }
      logger.info('Amortizations data loaded successfully', {
        amortizations: amortizationsData.length,
        property: propertyData ? 1 : 0
      });
    } catch (error) {
      logger.error('Error loading amortizations data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    const usefulLife = amortizationService.getUsefulLifeByCategory(category);
    setNewAmortization({
      ...newAmortization,
      category: category as any,
      usefulLifeYears: usefulLife
    });
  };

  const handleAddAmortization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canCreate) return;

    if (!newAmortization.itemName.trim()) {
      setError('Le nom de l\'équipement est requis');
      return;
    }

    if (newAmortization.purchaseAmount <= 0) {
      setError('Le montant d\'achat doit être supérieur à 0');
      return;
    }

    if (newAmortization.usefulLifeYears <= 0) {
      setError('La durée d\'amortissement doit être supérieure à 0');
      return;
    }

    try {
      setError(null);
      
      // Validation côté client avec le service
      const validationErrors = amortizationService.validateAmortizationData({
        purchase_amount: newAmortization.purchaseAmount,
        useful_life_years: newAmortization.usefulLifeYears
      });
      
      if (validationErrors.length > 0) {
        setError(validationErrors.join(', '));
        return;
      }

      const amortizationData = injectPropertyId({
        user_id: user.uid,
        item_name: newAmortization.itemName,
        category: newAmortization.category,
        purchase_date: newAmortization.purchaseDate,
        purchase_amount: newAmortization.purchaseAmount,
        useful_life_years: newAmortization.usefulLifeYears,
        accumulated_amortization: 0,
        status: 'active',
        notes: newAmortization.notes
      });
      
      await amortizationService.create(amortizationData);

      resetForm();
      await loadData();
      logger.info('Amortization added successfully');
    } catch (error) {
      logger.error('Error adding amortization:', error);
      setError('Erreur lors de l\'ajout de l\'amortissement: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  };

  const handleEditAmortization = (amortization: Amortization) => {
    setEditingAmortization(amortization);
    setNewAmortization({
      itemName: amortization.item_name,
      category: amortization.category,
      purchaseDate: amortization.purchase_date,
      purchaseAmount: amortization.purchase_amount,
      usefulLifeYears: amortization.useful_life_years,
      notes: amortization.notes || ''
    });
    setShowAddForm(true);
  };

  const handleUpdateAmortization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingAmortization) return;

    if (newAmortization.usefulLifeYears <= 0) {
      setError('La durée d\'amortissement doit être supérieure à 0');
      return;
    }

    try {
      setError(null);
      
      // Validation côté client
      const validationErrors = amortizationService.validateAmortizationData({
        purchase_amount: newAmortization.purchaseAmount,
        useful_life_years: newAmortization.usefulLifeYears
      });
      
      if (validationErrors.length > 0) {
        setError(validationErrors.join(', '));
        return;
      }

      await amortizationService.update(editingAmortization.id, {
        item_name: newAmortization.itemName,
        category: newAmortization.category,
        purchase_date: newAmortization.purchaseDate,
        purchase_amount: newAmortization.purchaseAmount,
        useful_life_years: newAmortization.usefulLifeYears,
        notes: newAmortization.notes
      });

      resetForm();
      await loadData();
      logger.info('Amortization updated successfully');
    } catch (error) {
      logger.error('Error updating amortization:', error);
      setError('Erreur lors de la mise à jour de l\'amortissement');
    }
  };

  const handleDeleteAmortization = async (amortizationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet amortissement ?')) return;
    
    try {
      setError(null);
      await amortizationService.delete(amortizationId);
      await loadData();
      logger.info('Amortization deleted successfully', { amortizationId });
    } catch (error) {
      logger.error('Error deleting amortization:', error);
      setError('Erreur lors de la suppression de l\'amortissement');
    }
  };

  const resetForm = () => {
    setNewAmortization({
      itemName: '',
      category: 'mobilier',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseAmount: 0,
      usefulLifeYears: 10,
      notes: ''
    });
    setShowAddForm(false);
    setEditingAmortization(null);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'mobilier': 'Mobilier',
      'electromenager': 'Électroménager',
      'informatique': 'Informatique',
      'travaux': 'Travaux',
      'amenagement': 'Aménagement',
      'autre': 'Autre'
    };
    return labels[category] || category;
  };

  const calculateProgress = (amortization: Amortization) => {
    const yearsElapsed = new Date().getFullYear() - new Date(amortization.purchase_date).getFullYear();
    return Math.min((yearsElapsed / amortization.useful_life_years) * 100, 100);
  };

  return (
    <PropertyContextGuard 
      requireProperty={true}
      fallbackMessage="Sélectionnez un bien pour gérer ses amortissements"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Amortissements LMNP</h1>
          <p className="text-gray-600">Gérez vos amortissements selon les règles fiscales LMNP</p>
        </div>
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
          <span>Ajouter un amortissement</span>
        </button>
      </div>

      {!canCreate && (
        <div className="mb-4 p-4 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
          {errors.cannotCreate}
        </div>
      )}

      {/* Aide contextuelle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Règles d'amortissement LMNP
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 mb-4">
              <li>• <strong>Mobilier :</strong> 10 ans (canapés, lits, tables, etc.)</li>
              <li>• <strong>Électroménager :</strong> 5 ans (réfrigérateur, lave-linge, etc.)</li>
              <li>• <strong>Informatique :</strong> 3 ans (ordinateurs, télévisions, etc.)</li>
              <li>• <strong>Travaux d'aménagement :</strong> 20 ans</li>
              <li>• <strong>Aménagements :</strong> 15 ans (cuisine équipée, salle de bain, etc.)</li>
            </ul>
            <p className="text-sm text-gray-600">
              L'amortissement permet de déduire chaque année une partie du coût d'acquisition de vos équipements.
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire d'ajout/modification */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingAmortization ? 'Modifier l\'amortissement' : 'Ajouter un nouvel amortissement'}
          </h2>
          <form onSubmit={editingAmortization ? handleUpdateAmortization : handleAddAmortization} className="space-y-4">
            <div>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Bien sélectionné: {currentProperty?.address || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'équipement *
                </label>
                <input
                  type="text"
                  value={newAmortization.itemName}
                  onChange={(e) => setNewAmortization({ ...newAmortization, itemName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Réfrigérateur Samsung"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie *
                </label>
                <select
                  value={newAmortization.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="mobilier">Mobilier (10 ans)</option>
                  <option value="electromenager">Électroménager (5 ans)</option>
                  <option value="informatique">Informatique (3 ans)</option>
                  <option value="travaux">Travaux (20 ans)</option>
                  <option value="amenagement">Aménagement (15 ans)</option>
                  <option value="autre">Autre (5 ans)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'achat *
                </label>
                <input
                  type="date"
                  value={newAmortization.purchaseDate}
                  onChange={(e) => setNewAmortization({ ...newAmortization, purchaseDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant d'achat (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newAmortization.purchaseAmount}
                  onChange={(e) => setNewAmortization({ ...newAmortization, purchaseAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée d'amortissement (années)
                </label>
                <input
                  type="number"
                  value={newAmortization.usefulLifeYears}
                  onChange={(e) => setNewAmortization({ ...newAmortization, usefulLifeYears: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={newAmortization.notes}
                onChange={(e) => setNewAmortization({ ...newAmortization, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Notes sur cet équipement..."
              />
            </div>

            {/* Aperçu du calcul */}
            {newAmortization.purchaseAmount > 0 && newAmortization.usefulLifeYears > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Aperçu du calcul</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Amortissement annuel:</span>
                    <div className="font-medium text-blue-600">
                      {Math.round((newAmortization.purchaseAmount / newAmortization.usefulLifeYears) * 100) / 100} €
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Amortissement mensuel:</span>
                    <div className="font-medium text-green-600">
                      {Math.round((newAmortization.purchaseAmount / newAmortization.usefulLifeYears / 12) * 100) / 100} €
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Durée totale:</span>
                    <div className="font-medium text-gray-900">
                      {newAmortization.usefulLifeYears} ans
                    </div>
                  </div>
                </div>
                {newAmortization.usefulLifeYears <= 0 && (
                  <div className="mt-2 text-red-600 text-sm">
                    ⚠️ La durée d'amortissement doit être supérieure à 0
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingAmortization ? 'Mettre à jour' : 'Ajouter l\'amortissement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des amortissements */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Amortissements enregistrés</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : amortizations.length === 0 ? (
          <div className="p-6 text-center">
            <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun amortissement</h3>
            <p className="text-gray-500 mb-4">Commencez par ajouter vos équipements à amortir</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ajouter un amortissement
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Équipement</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Propriété</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Catégorie</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Montant d'achat</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Amortissement annuel</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Progression</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {amortizations.map((amortization) => {
                  const progress = calculateProgress(amortization);
                  return (
                    <tr key={amortization.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{amortization.item_name}</div>
                          <div className="text-sm text-gray-500">
                            Acheté le {new Date(amortization.purchase_date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {currentProperty?.address || 'Bien sélectionné'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {getCategoryLabel(amortization.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {amortization.purchase_amount.toLocaleString()} €
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">
                        {amortization.annual_amortization.toLocaleString()} €
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 w-12">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {amortization.useful_life_years} ans
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleEditAmortization(amortization)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteAmortization(amortization.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Résumé des amortissements */}
      {amortizations.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <Calculator className="h-6 w-6 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Total des équipements</h3>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {
                amortizations
                  .reduce((sum, amortization) => sum + ensureNumber(amortization.purchase_amount), 0)
                  .toLocaleString()
              } €
            </div>
            <p className="text-sm text-gray-600">Valeur d'achat totale</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <Calculator className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-gray-900">Amortissement annuel</h3>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {
                amortizations
                  .reduce((sum, amortization) => sum + ensureNumber(amortization.annual_amortization), 0)
                  .toLocaleString()
              } €
            </div>
            <p className="text-sm text-gray-600">Déduction fiscale annuelle</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100">
            <div className="flex items-center space-x-3 mb-2">
              <Calculator className="h-6 w-6 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Valeur résiduelle</h3>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {
                amortizations
                  .reduce((sum, amortization) => sum + ensureNumber(amortization.remaining_value), 0)
                  .toLocaleString()
              } €
            </div>
            <p className="text-sm text-gray-600">Valeur restante à amortir</p>
          </div>
        </div>
      )}
    </div>
    </PropertyContextGuard>
  );
}