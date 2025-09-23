import React from 'react';
import { AlertCircle, Home, Plus } from 'lucide-react';
import { useCurrentProperty } from '../store/useCurrentProperty';
import { PropertySwitcher } from './PropertySwitcher';

interface PropertyContextGuardProps {
  children: React.ReactNode;
  requireProperty?: boolean;
  fallbackMessage?: string;
  showPropertySwitcher?: boolean;
}

export function PropertyContextGuard({ 
  children, 
  requireProperty = true,
  fallbackMessage = "Veuillez sélectionner un bien pour continuer",
  showPropertySwitcher = true
}: PropertyContextGuardProps) {
  const { isPropertySelected, currentProperty } = useCurrentProperty();

  if (requireProperty && !isPropertySelected) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun bien sélectionné
          </h3>
          <p className="text-gray-600 mb-6">
            {fallbackMessage}
          </p>
          
          {showPropertySwitcher && (
            <div className="mb-6">
              <PropertySwitcher />
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.href = '/properties'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Voir mes biens
            </button>
            <button
              onClick={() => window.location.href = '/properties'}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un bien
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Property Context Header */}
      {isPropertySelected && currentProperty && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Home className="h-5 w-5 text-blue-600" />
              <div>
                <span className="text-sm font-medium text-blue-900">
                  Bien sélectionné:
                </span>
                <span className="ml-2 text-sm text-blue-700">
                  {currentProperty.address}
                </span>
              </div>
            </div>
            {showPropertySwitcher && (
              <div className="flex-shrink-0">
                <PropertySwitcher />
              </div>
            )}
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}