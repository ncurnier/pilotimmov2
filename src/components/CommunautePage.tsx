import React, { useState } from 'react';
import { MessageCircle, Users, ThumbsUp, MessageSquare, Clock, Pin, Award } from 'lucide-react';
import logger from '../utils/logger';

export function CommunautePage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('debutant');
  const [likedPosts, setLikedPosts] = useState<number[]>([]);

  const handlePublishPost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert('Veuillez remplir le titre et le contenu');
      return;
    }
    
    logger.info('Publishing post:', {
      title: newPostTitle,
      content: newPostContent,
      category: newPostCategory
    });
    
    alert('Votre question a été publiée avec succès !');
    
    // Reset form
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostCategory('debutant');
  };

  const handleLikePost = (postId: number) => {
    setLikedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const handleContactSupport = () => {
    alert('Redirection vers le support client...');
  };

  const categories = [
    { id: 'all', label: 'Tous les sujets' },
    { id: 'debutant', label: 'Questions débutants' },
    { id: 'fiscal', label: 'Fiscalité' },
    { id: 'juridique', label: 'Juridique' },
    { id: 'gestion', label: 'Gestion locative' },
    { id: 'retours', label: 'Retours d\'expérience' }
  ];

  const discussions = [
    {
      id: 1,
      title: 'Comment optimiser mes déductions LMNP en 2025 ?',
      author: 'Marie L.',
      authorLevel: 'Expert',
      category: 'fiscal',
      replies: 23,
      likes: 45,
      lastActivity: '2h',
      isPinned: true,
      tags: ['déductions', 'optimisation', '2025'],
      excerpt: 'Je cherche des conseils pour maximiser mes déductions cette année...'
    },
    {
      id: 2,
      title: 'Première déclaration LMNP : par où commencer ?',
      author: 'Thomas M.',
      authorLevel: 'Débutant',
      category: 'debutant',
      replies: 18,
      likes: 32,
      lastActivity: '4h',
      isPinned: false,
      tags: ['première fois', 'aide', 'déclaration'],
      excerpt: 'Bonjour, je viens d\'acquérir mon premier bien en LMNP et je suis un peu perdu...'
    },
    {
      id: 3,
      title: 'Retour d\'expérience : 5 ans de LMNP à Lyon',
      author: 'Sophie D.',
      authorLevel: 'Expert',
      category: 'retours',
      replies: 67,
      likes: 128,
      lastActivity: '6h',
      isPinned: false,
      tags: ['retour expérience', 'lyon', 'rentabilité'],
      excerpt: 'Après 5 ans d\'investissement LMNP à Lyon, voici mon bilan...'
    },
    {
      id: 4,
      title: 'Changement de régime : micro-BIC vers réel ?',
      author: 'Pierre R.',
      authorLevel: 'Intermédiaire',
      category: 'fiscal',
      replies: 12,
      likes: 28,
      lastActivity: '1j',
      isPinned: false,
      tags: ['micro-BIC', 'régime réel', 'changement'],
      excerpt: 'À partir de quel seuil est-il intéressant de passer au régime réel ?'
    }
  ];

  const topContributors = [
    { name: 'Marie L.', posts: 156, likes: 1247, level: 'Expert' },
    { name: 'Jean-Paul M.', posts: 89, likes: 892, level: 'Expert' },
    { name: 'Sophie D.', posts: 67, likes: 634, level: 'Expert' },
    { name: 'Thomas B.', posts: 45, likes: 423, level: 'Intermédiaire' }
  ];

  const filteredDiscussions = discussions.filter(discussion => 
    selectedCategory === 'all' || discussion.category === selectedCategory
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Communauté PilotImmo</h1>
        <p className="text-gray-600">Échangez avec d'autres investisseurs LMNP et partagez vos expériences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Contenu principal */}
        <div className="lg:col-span-3">
          {/* Stats communauté */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">2,847</div>
              <div className="text-sm text-gray-600">Membres actifs</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">1,234</div>
              <div className="text-sm text-gray-600">Discussions</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <ThumbsUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">8,567</div>
              <div className="text-sm text-gray-600">Réponses utiles</div>
            </div>
          </div>

          {/* Nouvelle discussion */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Poser une question</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Titre de votre question..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Décrivez votre situation en détail..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              ></textarea>
              <div className="flex items-center justify-between">
                <select 
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="debutant">Questions débutants</option>
                  <option value="fiscal">Fiscalité</option>
                  <option value="juridique">Juridique</option>
                  <option value="gestion">Gestion locative</option>
                </select>
                <button 
                  onClick={handlePublishPost}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Publier
                </button>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2 mb-6">
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

          {/* Liste des discussions */}
          <div className="space-y-4">
            {filteredDiscussions.map((discussion) => (
              <div key={discussion.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold">
                      {discussion.author.charAt(0)}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      {discussion.isPinned && (
                        <Pin className="h-4 w-4 text-orange-500" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                        {discussion.title}
                      </h3>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">{discussion.excerpt}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {discussion.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>Par <strong>{discussion.author}</strong></span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          discussion.authorLevel === 'Expert' ? 'bg-purple-100 text-purple-800' :
                          discussion.authorLevel === 'Intermédiaire' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {discussion.authorLevel}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{discussion.replies}</span>
                        </div>
                        <button 
                          onClick={() => handleLikePost(discussion.id)}
                          className={`flex items-center space-x-1 transition-colors ${
                            likedPosts.includes(discussion.id) ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                          }`}
                        >
                          <ThumbsUp className={`h-4 w-4 ${likedPosts.includes(discussion.id) ? 'fill-current' : ''}`} />
                          <span>{discussion.likes}</span>
                        </button>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{discussion.lastActivity}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top contributeurs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top contributeurs</h3>
            <div className="space-y-4">
              {topContributors.map((contributor, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {contributor.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{contributor.name}</span>
                      {index < 3 && <Award className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <div className="text-xs text-gray-500">
                      {contributor.posts} posts • {contributor.likes} likes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Règles de la communauté */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Règles de la communauté</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-semibold">1.</span>
                <span>Restez respectueux et bienveillant</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-semibold">2.</span>
                <span>Partagez des informations vérifiées</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-semibold">3.</span>
                <span>Utilisez les bonnes catégories</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-semibold">4.</span>
                <span>Évitez le spam et la publicité</span>
              </div>
            </div>
          </div>

          {/* Aide */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Besoin d'aide ?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Notre équipe d'experts est là pour vous accompagner
            </p>
            <button 
              onClick={handleContactSupport}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Contacter le support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}