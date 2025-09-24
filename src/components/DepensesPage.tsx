import React, { useState, useEffect, useCallback } from 'react';
import { Leaf, ToggleLeft, ToggleRight, Edit, Plus, Trash2 } from 'lucide-react';
import { PropertyContextGuard } from './PropertyContextGuard';
import { usePropertyContext } from '@/hooks/usePropertyContext';
import { useAuth } from '@/hooks/useAuth';
import { expenseService } from '@/services/supabase/expenses';
import { propertyService } from '@/services/supabase/properties';
import type { Expense } from '@/services/supabase/types';
import logger from '@/utils/logger';

const ensureNumber = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

interface NewExpenseState {
  amount: number;
  date: string;
  description: string;
  category: Expense['category'];
  deductible: boolean;
}

export function DepensesPage() {
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState<NewExpenseState>({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: 'Charges déductibles',
    category: 'maintenance' as const,
    deductible: true
  });

  const loadData = useCallback(async () => {
    if (!user || !currentPropertyId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Charger seulement les données du bien sélectionné
      const [propertyData, expensesData] = await Promise.all([
        propertyService.getById(currentPropertyId),
        expenseService.getByPropertyId(currentPropertyId)
      ]);

      setExpenses(expensesData);
      if (propertyData) {
        setCurrentProperty(propertyData);
      } else {
        clearCurrentProperty();
      }
      logger.info('Expenses data loaded successfully', {
        property: propertyData ? 1 : 0,
        expenses: expensesData.length
      });
    } catch (error) {
      logger.error('Error loading expenses data:', error);
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

  const getPropertyExpenses = (propertyId: string) => {
    return expenses
      .filter(expense => expense.property_id === propertyId)
      .reduce((sum, expense) => sum + ensureNumber(expense.amount), 0);
  };

  const handleEditExpense = (propertyId: string) => {
    setEditingProperty(propertyId);
    setEditAmount(getPropertyExpenses(propertyId).toString());
  };

  const handleSaveExpense = async (propertyId: string) => {
    if (!user) return;
    
    try {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount < 0) {
        setError('Veuillez saisir un montant valide');
        return;
      }

      setError(null);

      // Supprimer les anciennes dépenses pour cette propriété
      const existingExpenses = expenses.filter(e => e.property_id === propertyId);
      for (const expense of existingExpenses) {
        await expenseService.delete(expense.id);
      }

      // Créer la nouvelle dépense si le montant est supérieur à 0
      if (amount > 0) {
        await expenseService.create({
          user_id: user.uid,
          property_id: propertyId,
          amount,
          date: new Date().toISOString().split('T')[0],
          description: 'Charges déductibles',
          category: 'maintenance',
          deductible: true
        });
      }

      setEditingProperty(null);
      setEditAmount('');
      await loadData();
      logger.info('Expense saved successfully', { propertyId, amount });
    } catch (error) {
      logger.error('Error saving expense:', error);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleCancelEdit = () => {
    setEditingProperty(null);
    setEditAmount('');
    setError(null);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canCreate) return;

    if (newExpense.amount <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    try {
      setError(null);
      const expenseData = injectPropertyId({
        user_id: user.uid,
        amount: newExpense.amount,
        date: newExpense.date,
        description: newExpense.description,
        category: newExpense.category,
        deductible: newExpense.deductible
      });
      
      await expenseService.create(expenseData);

      setNewExpense({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: 'Charges déductibles',
        category: 'maintenance',
        deductible: true
      });
      setShowAddForm(false);
      await loadData();
      logger.info('New expense added successfully');
    } catch (error) {
      logger.error('Error adding expense:', error);
      setError('Erreur lors de l\'ajout de la dépense');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;
    
    try {
      setError(null);
      await expenseService.delete(expenseId);
      await loadData();
      logger.info('Expense deleted successfully', { expenseId });
    } catch (error) {
      logger.error('Error deleting expense:', error);
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <PropertyContextGuard 
      requireProperty={true}
      fallbackMessage="Sélectionnez un bien pour gérer ses dépenses"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dépenses</h1>
          <p className="text-gray-600">Gérez vos charges déductibles</p>
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
            <span>Ajouter une dépense</span>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ajouter une dépense</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      category: e.target.value as Expense['category']
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="insurance">Assurance</option>
                  <option value="taxes">Taxes</option>
                  <option value="management">Gestion</option>
                  <option value="utilities">Charges</option>
                  <option value="repairs">Réparations</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Charges déductibles"
                  required
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="deductible"
                checked={newExpense.deductible}
                onChange={(e) => setNewExpense({ ...newExpense, deductible: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="deductible" className="ml-2 block text-sm text-gray-900">
                Dépense déductible
              </label>
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
                Ajouter la dépense
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
              <Leaf className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Les dépenses déductibles
              </h3>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li>• Seules les dépenses effectuées durant l'année de la déclaration sont déductibles.</li>
                <li>• Les factures antérieures à cette année ne sont pas déductibles.</li>
                <li>• Pour les nouvelles activités, seules les factures payées après la date de début d'activité sont déductibles.</li>
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

      {/* Liste des dépenses détaillées */}
      {expenses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Dépenses détaillées</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Propriété</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Catégorie</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Montant</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Déductible</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => {
                  return (
                    <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {currentProperty?.address || 'Propriété sélectionnée'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {expense.category === 'maintenance' ? 'Maintenance' :
                           expense.category === 'insurance' ? 'Assurance' :
                           expense.category === 'taxes' ? 'Taxes' :
                           expense.category === 'management' ? 'Gestion' :
                           expense.category === 'utilities' ? 'Charges' :
                           expense.category === 'repairs' ? 'Réparations' : 'Autre'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-red-600">
                        -{expense.amount.toLocaleString()} €
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          expense.deductible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {expense.deductible ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteExpense(expense.id)}
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

      {/* Tableau des dépenses par bien */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Dépenses par bien</h2>
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
                  const expense = getPropertyExpenses(currentProperty.id);
                  const isEditing = editingProperty === currentProperty.id;

                  return (
                    <tr key={currentProperty.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {currentProperty.address}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">0 €</span>
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
                              onClick={() => handleSaveExpense(currentProperty.id)}
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
                          <span className="text-sm font-medium text-red-600">
                            -{expense.toLocaleString()} €
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">-0 €</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">-</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          expense > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {expense > 0 ? 'Complet' : 'À compléter'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditExpense(currentProperty.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Modifier les dépenses"
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

      {/* Section étapes suivantes */}
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-xl font-bold text-blue-600">4</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Intérêts d'emprunt</h3>
          <p className="text-sm text-gray-600 mb-4">
            Saisissez vos intérêts d'emprunt immobilier
          </p>
          <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
            À compléter
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-xl font-bold text-green-600">✓</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Amortissement</h3>
          <p className="text-sm text-gray-600 mb-4">
            Calculez vos amortissements du matériel
          </p>
          <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
            Complet
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-xl font-bold text-gray-600">6</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Récapitulatif</h3>
          <p className="text-sm text-gray-600 mb-4">
            Vérifiez et validez votre déclaration
          </p>
          <span className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-full">
            En attente
          </span>
        </div>
      </div>
    </div>
    </PropertyContextGuard>
  );
}