import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Home, Search, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { propertyService } from '@/services/supabase/properties';
import { useCurrentProperty } from '@/store/useCurrentProperty';
import type { Property } from '@/services/supabase/types';
import logger from '@/utils/logger';

export function PropertySwitcher() {
  const { user } = useAuth();
  const { currentProperty, currentPropertyId, setCurrentProperty, clearCurrentProperty } = useCurrentProperty();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadProperties = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const userProperties = await propertyService.getByUserId(user.uid);
      setProperties(userProperties);
      logger.info('Properties loaded for switcher:', userProperties.length);
    } catch (error) {
      logger.error('Error loading properties for switcher:', error);
      setError('Erreur lors du chargement des biens');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadProperties();
    }
  }, [user, loadProperties]);

  // Load current property details if we only have the ID
  useEffect(() => {
    if (currentPropertyId && !currentProperty && properties.length > 0) {
      const property = properties.find(p => p.id === currentPropertyId);
      if (property) {
        setCurrentProperty(property);
      } else {
        clearCurrentProperty();
      }
    }
  }, [currentPropertyId, currentProperty, properties, setCurrentProperty, clearCurrentProperty]);

  const handlePropertySelect = (property: Property) => {
    setCurrentProperty(property);
    setShowDropdown(false);
    setSearchTerm('');
    logger.info('Property selected:', { id: property.id, address: property.address });
  };

  const filteredProperties = properties.filter(property =>
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[280px]"
      >
        <Home className="h-5 w-5 text-gray-400" />
        <div className="flex-1 text-left">
          {currentProperty ? (
            <div>
              <div className="font-medium text-gray-900 truncate">
                {currentProperty.address}
              </div>
              <div className="text-sm text-gray-500">
                {currentProperty.monthly_rent.toLocaleString()} €/mois
              </div>
            </div>
          ) : (
            <div className="text-gray-500">
              Sélectionner un bien...
            </div>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
          showDropdown ? 'rotate-180' : ''
        }`} />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un bien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Properties List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Chargement...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={loadProperties}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Réessayer
                </button>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="p-4 text-center">
                <Home className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {searchTerm ? 'Aucun bien trouvé' : 'Aucun bien enregistré'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      // Navigate to properties page - this would need to be handled by parent
                      window.location.href = '/properties';
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Ajouter un bien
                  </button>
                )}
              </div>
            ) : (
              <div className="py-2">
                {filteredProperties.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handlePropertySelect(property)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {property.address}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-4">
                        <span>{property.monthly_rent.toLocaleString()} €/mois</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          property.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {property.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                    {currentPropertyId === property.id && (
                      <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Selection */}
          {currentProperty && (
            <div className="border-t border-gray-100 p-2">
              <button
                onClick={() => {
                  clearCurrentProperty();
                  setShowDropdown(false);
                }}
                className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
              >
                Désélectionner le bien
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}