import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Calendar, Phone, Mail, MapPin } from 'lucide-react';
import { PropertyContextGuard } from './PropertyContextGuard';
import { usePropertyContext } from '../hooks/usePropertyContext';
import { useAuth } from '../hooks/useAuth';
import { tenantService } from '../services/supabase/tenants';
import { propertyService } from '../services/supabase/properties';
import type { Tenant } from '../services/supabase/types';
import logger from '../utils/logger';

interface TenantsPageProps {
  onPageChange?: (page: string) => void;
}

export function TenantsPage({ onPageChange }: TenantsPageProps) {
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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [newTenant, setNewTenant] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    monthlyRent: 0,
    deposit: 0,
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
      const [tenantsData, propertyData] = await Promise.all([
        tenantService.getByPropertyId(currentPropertyId),
        propertyService.getById(currentPropertyId)
      ]);

      setTenants(tenantsData);
      if (propertyData) {
        setCurrentProperty(propertyData);
      } else {
        clearCurrentProperty();
      }
      logger.info('Tenants data loaded successfully', {
        tenants: tenantsData.length,
        property: propertyData ? 1 : 0
      });
    } catch (error) {
      logger.error('Error loading tenants data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canCreate) return;

    if (!newTenant.firstName.trim() || !newTenant.lastName.trim()) {
      setError('Le prénom et le nom sont requis');
      return;
    }

    if (newTenant.monthlyRent <= 0) {
      setError('Le loyer mensuel doit être supérieur à 0');
      return;
    }

    try {
      setError(null);
      
      // Terminer le bail du locataire actuel s'il y en a un
      const currentTenant = await tenantService.getCurrentTenant(currentPropertyId);
      if (currentTenant) {
        await tenantService.endTenancy(currentTenant.id, newTenant.startDate);
      }

      const tenantData = injectPropertyId({
        user_id: user.uid,
        first_name: newTenant.firstName,
        last_name: newTenant.lastName,
        email: newTenant.email,
        phone: newTenant.phone,
        start_date: newTenant.startDate,
        end_date: newTenant.endDate || undefined,
        monthly_rent: newTenant.monthlyRent,
        deposit: newTenant.deposit,
        status: 'active',
        notes: newTenant.notes
      });
      
      await tenantService.create(tenantData);

      resetForm();
      await loadData();
      logger.info('Tenant added successfully');
    } catch (error) {
      logger.error('Error adding tenant:', error);
      setError('Erreur lors de l\'ajout du locataire');
    }
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setNewTenant({
      firstName: tenant.first_name,
      lastName: tenant.last_name,
      email: tenant.email || '',
      phone: tenant.phone || '',
      startDate: tenant.start_date,
      endDate: tenant.end_date || '',
      monthlyRent: tenant.monthly_rent,
      deposit: tenant.deposit,
      notes: tenant.notes || ''
    });
    setShowAddForm(true);
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTenant) return;

    try {
      setError(null);
      await tenantService.update(editingTenant.id, {
        first_name: newTenant.firstName,
        last_name: newTenant.lastName,
        email: newTenant.email,
        phone: newTenant.phone,
        start_date: newTenant.startDate,
        end_date: newTenant.endDate || undefined,
        monthly_rent: newTenant.monthlyRent,
        deposit: newTenant.deposit,
        notes: newTenant.notes
      });

      resetForm();
      await loadData();
      logger.info('Tenant updated successfully');
    } catch (error) {
      logger.error('Error updating tenant:', error);
      setError('Erreur lors de la mise à jour du locataire');
    }
  };

  const handleEndTenancy = async (tenantId: string) => {
    const endDate = prompt('Date de fin de bail (YYYY-MM-DD):');
    if (!endDate) return;

    try {
      setError(null);
      await tenantService.endTenancy(tenantId, endDate);
      await loadData();
      logger.info('Tenancy ended successfully', { tenantId });
    } catch (error) {
      logger.error('Error ending tenancy:', error);
      setError('Erreur lors de la fin du bail');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce locataire ?')) return;
    
    try {
      setError(null);
      await tenantService.delete(tenantId);
      await loadData();
      logger.info('Tenant deleted successfully', { tenantId });
    } catch (error) {
      logger.error('Error deleting tenant:', error);
      setError('Erreur lors de la suppression du locataire');
    }
  };

  const resetForm = () => {
    setNewTenant({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      monthlyRent: 0,
      deposit: 0,
      notes: ''
    });
    setShowAddForm(false);
    setEditingTenant(null);
  };

  return (
    <PropertyContextGuard 
      requireProperty={true}
      fallbackMessage="Sélectionnez un bien pour gérer ses locataires"
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestion des locataires</h1>
          <p className="text-gray-600">Gérez vos locataires et leurs baux</p>
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
          <span>Ajouter un locataire</span>
        </button>
      </div>

      {!canCreate && (
        <div className="mb-4 p-4 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
          {errors.cannotCreate}
        </div>
      )}

      {/* Formulaire d'ajout/modification */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingTenant ? 'Modifier le locataire' : 'Ajouter un nouveau locataire'}
          </h2>
          <form onSubmit={editingTenant ? handleUpdateTenant : handleAddTenant} className="space-y-4">
            <div>
              <div>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Bien sélectionné: {currentProperty?.address || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={newTenant.firstName}
                  onChange={(e) => setNewTenant({ ...newTenant, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  value={newTenant.lastName}
                  onChange={(e) => setNewTenant({ ...newTenant, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newTenant.email}
                  onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={newTenant.startDate}
                  onChange={(e) => setNewTenant({ ...newTenant, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin (optionnel)
                </label>
                <input
                  type="date"
                  value={newTenant.endDate}
                  onChange={(e) => setNewTenant({ ...newTenant, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loyer mensuel (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTenant.monthlyRent}
                  onChange={(e) => setNewTenant({ ...newTenant, monthlyRent: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dépôt de garantie (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTenant.deposit}
                  onChange={(e) => setNewTenant({ ...newTenant, deposit: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={newTenant.notes}
                onChange={(e) => setNewTenant({ ...newTenant, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Notes sur le locataire..."
              />
            </div>

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
                {editingTenant ? 'Mettre à jour' : 'Ajouter le locataire'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des locataires */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Locataires</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun locataire</h3>
            <p className="text-gray-500 mb-4">Commencez par ajouter votre premier locataire</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ajouter un locataire
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tenant.first_name} {tenant.last_name}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                        tenant.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tenant.status === 'active' ? 'Actif' :
                         tenant.status === 'ended' ? 'Terminé' : 'Inactif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">Bien actuel</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Du {new Date(tenant.start_date).toLocaleDateString('fr-FR')}
                          {tenant.end_date && ` au ${new Date(tenant.end_date).toLocaleDateString('fr-FR')}`}
                        </span>
                      </div>
                      {tenant.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>{tenant.email}</span>
                        </div>
                      )}
                      {tenant.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{tenant.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                      <span className="font-medium text-green-600">
                        Loyer: {tenant.monthly_rent.toLocaleString()} €/mois
                      </span>
                      {tenant.deposit > 0 && (
                        <span className="text-gray-600">
                          Dépôt: {tenant.deposit.toLocaleString()} €
                        </span>
                      )}
                    </div>

                    {tenant.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">{tenant.notes}</p>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button 
                      onClick={() => handleEditTenant(tenant)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    {tenant.status === 'active' && (
                      <button 
                        onClick={() => handleEndTenancy(tenant.id)}
                        className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                        title="Terminer le bail"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleDeleteTenant(tenant.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </PropertyContextGuard>
  );
}