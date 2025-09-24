import React, { useState } from 'react';
import { Users, Star, MapPin, Phone, Mail, ExternalLink, Filter, Search } from 'lucide-react';
import logger from '@/utils/logger';

export function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [contactedPartners, setContactedPartners] = useState<number[]>([]);

  const handleContactPartner = (partnerId: number) => {
    setContactedPartners(prev => [...prev, partnerId]);
    logger.info('Contacting partner:', partnerId);
    alert('Demande de contact envoyée ! Le partenaire vous contactera sous 24h.');
  };

  const handleCallPartner = (partnerId: number) => {
    logger.info('Calling partner:', partnerId);
    alert('Redirection vers l\'appel téléphonique...');
  };

  const categories = [
    { id: 'all', label: 'Tous les services' },
    { id: 'comptable', label: 'Experts-comptables' },
    { id: 'juridique', label: 'Conseils juridiques' },
    { id: 'diagnostic', label: 'Diagnostics immobiliers' },
    { id: 'assurance', label: 'Assurances' },
    { id: 'travaux', label: 'Travaux & Rénovation' },
    { id: 'gestion', label: 'Gestion locative' }
  ];

  const partners = [
    {
      id: 1,
      name: 'Cabinet Durand & Associés',
      category: 'comptable',
      rating: 4.8,
      reviews: 127,
      location: 'Paris 8ème',
      specialties: ['LMNP', 'Fiscalité immobilière', 'Optimisation'],
      description: 'Spécialistes de la fiscalité LMNP depuis 15 ans. Accompagnement personnalisé pour optimiser vos déclarations.',
      price: 'À partir de 150€/déclaration',
      verified: true,
      image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      id: 2,
      name: 'Diagnostic Pro Immobilier',
      category: 'diagnostic',
      rating: 4.9,
      reviews: 89,
      location: 'Lyon',
      specialties: ['DPE', 'Amiante', 'Plomb', 'Gaz'],
      description: 'Diagnostics immobiliers certifiés pour vos biens locatifs. Intervention rapide et tarifs préférentiels.',
      price: 'À partir de 120€',
      verified: true,
      image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      id: 3,
      name: 'Maître Leblanc - Avocat',
      category: 'juridique',
      rating: 4.7,
      reviews: 156,
      location: 'Bordeaux',
      specialties: ['Droit immobilier', 'Contentieux locatif', 'LMNP'],
      description: 'Conseil juridique spécialisé en droit immobilier et accompagnement dans vos démarches LMNP.',
      price: 'Consultation: 180€/h',
      verified: true,
      image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      id: 4,
      name: 'AssurImmo Plus',
      category: 'assurance',
      rating: 4.6,
      reviews: 203,
      location: 'National',
      specialties: ['PNO', 'GLI', 'Responsabilité civile'],
      description: 'Assurances spécialisées pour propriétaires bailleurs. Tarifs négociés et couverture optimale.',
      price: 'Devis gratuit',
      verified: true,
      image: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  ];

  const filteredPartners = partners.filter(partner => {
    const matchesCategory = selectedCategory === 'all' || partner.category === selectedCategory;
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Marketplace des partenaires</h1>
        <p className="text-gray-600">Trouvez les meilleurs experts pour vos besoins LMNP</p>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des partenaires */}
      <div className="grid lg:grid-cols-2 gap-6">
        {filteredPartners.map((partner) => (
          <div key={partner.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <img
                  src={partner.image}
                  alt={partner.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{partner.name}</h3>
                    {partner.verified && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Vérifié
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{partner.rating}</span>
                      <span>({partner.reviews} avis)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{partner.location}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {partner.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{partner.description}</p>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">{partner.price}</span>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleCallPartner(partner.id)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Appeler</span>
                  </button>
                  <button 
                    onClick={() => handleContactPartner(partner.id)}
                    className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      contactedPartners.includes(partner.id)
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    <span>{contactedPartners.includes(partner.id) ? 'Contacté' : 'Contacter'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section avantages */}
      <div className="mt-12 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-8 border border-blue-200">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pourquoi choisir nos partenaires ?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Tous nos partenaires sont sélectionnés et vérifiés pour leur expertise en LMNP et leur qualité de service
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Experts vérifiés</h3>
            <p className="text-sm text-gray-600">Tous nos partenaires sont certifiés et spécialisés en LMNP</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Tarifs négociés</h3>
            <p className="text-sm text-gray-600">Bénéficiez de tarifs préférentiels réservés aux utilisateurs PilotImmo</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Suivi intégré</h3>
            <p className="text-sm text-gray-600">Suivez vos demandes directement depuis votre tableau de bord</p>
          </div>
        </div>
      </div>
    </div>
  );
}