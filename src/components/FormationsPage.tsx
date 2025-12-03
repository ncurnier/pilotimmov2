import { useState } from 'react';
import { BookOpen, Play, Users, Award, CheckCircle, Star } from 'lucide-react';
import logger from '@/utils/logger';

export function FormationsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [enrolledTrainings, setEnrolledTrainings] = useState<string[]>([]);

  const handleEnrollTraining = (trainingId: string, price: string) => {
    if (price === 'Gratuit') {
      setEnrolledTrainings(prev => [...prev, trainingId]);
      logger.info('Enrolled in free training:', trainingId);
      alert('Inscription réussie ! Vous pouvez maintenant accéder à cette formation.');
    } else {
      logger.info('Redirecting to payment for training:', trainingId);
      alert(`Redirection vers le paiement pour la formation (${price})`);
    }
  };

  const handleStartFreeTraining = () => {
    setEnrolledTrainings(prev => [...prev, '1']);
    alert('Formation gratuite démarrée ! Bienvenue dans "Les bases du LMNP".');
  };

  const categories = [
    { id: 'all', label: 'Toutes les formations' },
    { id: 'debutant', label: 'Débutant' },
    { id: 'intermediaire', label: 'Intermédiaire' },
    { id: 'avance', label: 'Avancé' },
    { id: 'fiscal', label: 'Fiscalité' },
    { id: 'juridique', label: 'Juridique' }
  ];

  const formations = [
    {
      id: 1,
      title: 'Les bases du LMNP',
      description: 'Découvrez les fondamentaux de la location meublée non professionnelle',
      duration: '2h 30min',
      level: 'debutant',
      students: 1247,
      rating: 4.8,
      price: 'Gratuit',
      image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
      modules: 8,
      certificate: true,
      instructor: 'Marie Dubois',
      category: 'debutant'
    },
    {
      id: 2,
      title: 'Optimisation fiscale LMNP',
      description: 'Maximisez vos déductions et optimisez votre fiscalité immobilière',
      duration: '4h 15min',
      level: 'intermediaire',
      students: 892,
      rating: 4.9,
      price: '49€',
      image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400',
      modules: 12,
      certificate: true,
      instructor: 'Jean Martin',
      category: 'fiscal'
    },
    {
      id: 3,
      title: 'Déclarations LMNP avancées',
      description: 'Maîtrisez les déclarations complexes et les cas particuliers',
      duration: '3h 45min',
      level: 'avance',
      students: 456,
      rating: 4.7,
      price: '79€',
      image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400',
      modules: 10,
      certificate: true,
      instructor: 'Sophie Leroy',
      category: 'avance'
    },
    {
      id: 4,
      title: 'Aspects juridiques du LMNP',
      description: 'Comprenez le cadre légal et évitez les pièges juridiques',
      duration: '2h 20min',
      level: 'intermediaire',
      students: 634,
      rating: 4.6,
      price: '39€',
      image: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400',
      modules: 7,
      certificate: true,
      instructor: 'Pierre Moreau',
      category: 'juridique'
    }
  ];

  const filteredFormations = formations.filter(formation => 
    selectedCategory === 'all' || formation.category === selectedCategory
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Formations LMNP</h1>
        <p className="text-gray-600">Développez vos compétences avec nos formations spécialisées</p>
      </div>

      {/* Hero section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white mb-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Maîtrisez le LMNP comme un expert</h2>
            <p className="text-blue-100 mb-6">
              Formations créées par des experts fiscaux et juridiques. Apprenez à votre rythme 
              avec des cas pratiques et obtenez votre certification.
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>+3,000 étudiants</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Certifications reconnues</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>4.8/5 de satisfaction</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm">
              <BookOpen className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Commencez gratuitement</h3>
              <p className="text-blue-100 text-sm mb-4">
                Accédez à notre formation de base sans engagement
              </p>
              <button 
                onClick={handleStartFreeTraining}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Démarrer maintenant
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-8">
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

      {/* Liste des formations */}
      <div className="grid lg:grid-cols-2 gap-6 mb-12">
        {filteredFormations.map((formation) => (
          <div key={formation.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative">
              <img
                src={formation.image}
                alt={formation.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  formation.level === 'debutant' ? 'bg-green-100 text-green-800' :
                  formation.level === 'intermediaire' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {formation.level.charAt(0).toUpperCase() + formation.level.slice(1)}
                </span>
              </div>
              <div className="absolute top-4 right-4">
                <span className="bg-black/70 text-white px-2 py-1 rounded text-sm">
                  {formation.duration}
                </span>
              </div>
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button className="bg-white/90 text-gray-900 p-3 rounded-full hover:bg-white transition-colors">
                  <Play className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{formation.title}</h3>
                <span className="text-lg font-bold text-blue-600">{formation.price}</span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{formation.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{formation.modules} modules</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{formation.students.toLocaleString()} étudiants</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span>{formation.rating}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-600">{formation.instructor}</span>
                  {formation.certificate && (
                    <Award className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                  )}
                </div>
                <button 
                  onClick={() => handleEnrollTraining(formation.id.toString(), formation.price)}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    enrolledTrainings.includes(formation.id.toString())
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {enrolledTrainings.includes(formation.id.toString()) 
                    ? 'Inscrit' 
                    : formation.price === 'Gratuit' ? 'Commencer' : 'S\'inscrire'
                  }
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Parcours de formation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Parcours de formation recommandé</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Suivez notre parcours structuré pour devenir un expert LMNP en quelques semaines
          </p>
        </div>
        
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2"></div>
          
          {[
            { step: 1, title: 'Bases LMNP', status: 'completed' },
            { step: 2, title: 'Fiscalité', status: 'current' },
            { step: 3, title: 'Juridique', status: 'upcoming' },
            { step: 4, title: 'Expert', status: 'upcoming' }
          ].map((item, index) => (
            <div key={index} className="relative bg-white">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                item.status === 'completed' ? 'bg-green-100 border-green-500 text-green-600' :
                item.status === 'current' ? 'bg-blue-100 border-blue-500 text-blue-600' :
                'bg-gray-100 border-gray-300 text-gray-400'
              }`}>
                {item.status === 'completed' ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <span className="font-semibold">{item.step}</span>
                )}
              </div>
              <div className="absolute top-14 left-1/2 transform -translate-x-1/2 text-center">
                <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{item.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}