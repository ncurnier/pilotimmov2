import React, { useState } from 'react';
import { Plus, MapPin, Calendar, Edit, MoreVertical, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCurrentProperty } from '../store/useCurrentProperty';
import { propertyService } from '../services/supabase/properties';
import type { Property } from '../services/supabase/types';
import logger from '../utils/logger';

interface PropertiesPageProps {
  onPageChange?: (page: string) => void;
}

export function PropertiesPage({ onPageChange }: PropertiesPageProps) {
  const { user } = useAuth();
  const { setCurrentProperty, currentPropertyId } = useCurrentProperty();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [newProperty, setNewProperty] = useState({
    address: '',
    startDate: '',
    monthlyRent: 0
  });

  React.useEffect(() => {
    if (user) {
      loadProperties();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadProperties = async () => {
    if (!user) return;
    
    try {
      setError(null);
      const userProperties = await propertyService.getByUserId(user.uid);
      setProperties(userProperties);
    } catch (error) {
      logger.error('Error loading properties:', error);
      setError("Erreur lors du chargement des propriétés");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newProperty.address.trim()) {
      setError("L'adresse est requise");
      return;
    }

    if (!newProperty.startDate) {
      setError("La date de début est requise");
      return;
    }

    if (newProperty.monthlyRent <= 0) {
      setError("Le loyer mensuel doit être supérieur à 0");
      return;
    }

    try {
      setError(null);
      await propertyService.create({
        user_id: user.uid,
        address: newProperty.address,
        start_date: newProperty.startDate,
        monthly_rent: newProperty.monthlyRent,
        status: 'active'
      });
      
      setNewProperty({ address: '', startDate: '', monthlyRent: 0 });
      setShowAddForm(false);
      await loadProperties();
      logger.info('Property added successfully');
    } catch (error) {
      logger.error('Error adding property:', error);
      setError("Erreur lors de l'ajout du bien");
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setNewProperty({
      address: property.address,
      startDate: property.start_date,
      monthlyRent: property.monthly_rent
    });
    setShowAddForm(true);
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingProperty) return;

    try {
      setError(null);
      await propertyService.update(editingProperty.id, {
        address: newProperty.address,
        start_date: newProperty.startDate,
        monthly_rent: newProperty.monthlyRent
      });
      
      setNewProperty({ address: '', startDate: '', monthlyRent: 0 });
      setShowAddForm(false);
      setEditingProperty(null);
      await loadProperties();
      logger.info('Property updated successfully');
    } catch (error) {
      logger.error('Error updating property:', error);
      setError("Erreur lors de la mise à jour du bien");
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) return;
    
    try {
      setError(null);
      await propertyService.delete(propertyId);
      await loadProperties();
      logger.info('Property deleted successfully', { propertyId });
    } catch (error) {
      logger.error('Error deleting property:', error);
      setError("Erreur lors de la suppression du bien");
    }
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingProperty(null);
    setNewProperty({ address: '', startDate: '', monthlyRent: 0 });
  };

  const handleSelectProperty = (property: Property) => {
    setCurrentProperty(property);
    logger.info('Property selected from properties page:', { id: property.id, address: property.address });
    
    // Optionally navigate to a specific page after selection
    if (onPageChange) {
      onPageChange('recettes');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes biens LMNP</h1>
          <p className="text-gray-600">Gérez vos propriétés en location meublée</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Ajouter un bien</span>
        </button>
      </div>

      {/* Formulaire d'ajout de bien */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingProperty ? 'Modifier le bien' : 'Ajouter un nouveau bien'}
          </h2>
          <form onSubmit={editingProperty ? handleUpdateProperty : handleAddProperty} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse du bien
              </label>
              <input
                type="text"
                value={newProperty.address}
                onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="59 rue Pierre renaudel 33130 Begles"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début LMNP
                </label>
                <input
                  type="date"
                  value={newProperty.startDate}
                  onChange={(e) => setNewProperty({ ...newProperty, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loyer mensuel (€)
                </label>
                <input
                  type="number"
                  value={newProperty.monthlyRent}
                  onChange={(e) => setNewProperty({ ...newProperty, monthlyRent: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="760"
                  required
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingProperty ? 'Mettre à jour' : 'Ajouter le bien'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Aide contextuelle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Quelle date d'entrée du bien dans l'activité LMNP choisir ?
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 mb-4">
              <li>• La "date d'entrée du bien dans l'activité LMNP" doit correspondre à la date d'immatriculation du bien renseigné lors de l'immatriculation auprès du greffe ou sur inpi.fr</li>
              <li>• C'est généralement la date de début de l'activité de location meublée.</li>
              <li>• Vous pouvez retrouver cette date sur le site pappers.fr en indiquant le numéro de siret de votre activité LMNP.</li>
            </ul>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
              En savoir plus
            </button>
          </div>
        </div>
      </div>

      {/* Liste des biens */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Propriétés enregistrées</h2>
            <button 
              onClick={() => onPageChange?.('recettes')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
              Étape suivante
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des propriétés...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 mb-4">Aucune propriété enregistrée</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ajouter votre premier bien
            </button>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Adresse du bien</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date de début LMNP</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Loyer mensuel</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Statut</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{property.address}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{property.start_date}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-blue-600">
                      {property.monthly_rent.toLocaleString()} €
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      property.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleSelectProperty(property)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          currentPropertyId === property.id
                            ? 'bg-blue-100 text-blue-800 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                        title={currentPropertyId === property.id ? 'Bien sélectionné' : 'Sélectionner ce bien'}
                      >
                        {currentPropertyId === property.id ? 'Sélectionné' : 'Sélectionner'}
                      </button>
                      <button 
                        onClick={() => handleEditProperty(property)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProperty(property.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}