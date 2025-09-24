import { useEffect, useState } from "react";
import { useCurrentProperty } from "../../store/useCurrentProperty";
import { listMyProperties, getPropertyById } from "../../services/supabase/properties";
import { supabase } from "../../lib/supabaseClient";
import { Home, ChevronDown } from "lucide-react";

export default function PropertyPicker() {
  const { currentPropertyId, currentProperty, setCurrentProperty, clearCurrentProperty } = useCurrentProperty();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Vérifier l'authentification
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Utilisateur non connecté");
          return;
        }

        // Charger les propriétés
        const data = await listMyProperties();
        setProperties(data);
        
        // Si aucune propriété sélectionnée mais qu'il y en a, sélectionner la première
        if (!currentPropertyId && data.length > 0) {
          setCurrentProperty(data[0]);
        }
        
        // Si une propriété est sélectionnée mais qu'on n'a pas ses détails, les charger
        if (currentPropertyId && !currentProperty) {
          const property = data.find(p => p.id === currentPropertyId);
          if (property) {
            setCurrentProperty(property);
          } else {
            clearCurrentProperty();
          }
        }
      } catch (err) {
        console.error('Error loading properties:', err);
        setError('Erreur lors du chargement des biens');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPropertyId, currentProperty, setCurrentProperty, clearCurrentProperty]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Chargement des biens…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <Home className="h-5 w-5 text-orange-600" />
          <span className="text-orange-700 font-medium">Aucun bien enregistré</span>
        </div>
        <p className="text-orange-600 text-sm mt-1">
          Créez d'abord un bien dans la section "Mes biens LMNP"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Bien sélectionné
      </label>
      <div className="relative">
        <select 
          value={currentPropertyId ?? ""} 
          onChange={(e) => {
            const selectedProperty = properties.find(p => p.id === e.target.value);
            if (selectedProperty) {
              setCurrentProperty(selectedProperty);
            }
          }}
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
        >
          <option value="">Sélectionner un bien...</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.address} - {property.monthly_rent?.toLocaleString() || 0}€/mois
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      
      {currentProperty && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Home className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {currentProperty.address}
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Loyer: {currentProperty.monthly_rent?.toLocaleString() || 0}€/mois • 
            Statut: {currentProperty.status === 'active' ? 'Actif' : 'Inactif'}
          </p>
        </div>
      )}
    </div>
  );
}