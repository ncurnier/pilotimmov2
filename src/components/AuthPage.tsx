import { useState } from 'react';
import { Building2, Eye, EyeOff, ArrowLeft, Shield, Mail, Lock, User, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import logger from '@/utils/logger';

interface AuthPageProps {
  onLogin: () => void;
  onBackToHome: () => void;
}

export function AuthPage({ onLogin, onBackToHome }: AuthPageProps) {
  const { signIn, signUp, resetPassword, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [enable2FA, setEnable2FA] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleInputChange = (field: string, value: string) => {
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }

    switch (field) {
      case 'email':
        setEmail(value);
        if (value && !validateEmail(value)) {
          setValidationErrors(prev => ({ ...prev, email: 'Format d\'email invalide' }));
        }
        break;
      case 'password':
        setPassword(value);
        if (value && !validatePassword(value)) {
          setValidationErrors(prev => ({ ...prev, password: 'Le mot de passe doit contenir au moins 8 caractères' }));
        }
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        if (value && value !== password) {
          setValidationErrors(prev => ({ ...prev, confirmPassword: 'Les mots de passe ne correspondent pas' }));
        }
        break;
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'phone':
        setPhone(value);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: {[key: string]: string} = {};

    if (!validateEmail(email)) {
      errors.email = 'Format d\'email invalide';
    }

    if (!validatePassword(password)) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (!isLogin) {
      if (!firstName.trim()) {
        errors.firstName = 'Le prénom est requis';
      }
      if (!lastName.trim()) {
        errors.lastName = 'Le nom est requis';
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
      if (!acceptTerms) {
        errors.terms = 'Vous devez accepter les conditions d\'utilisation';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const authPromise = isLogin
      ? signIn(email, password)
      : signUp(email, password, `${firstName} ${lastName}`);

    authPromise
      .then(() => {
        onLogin();
      })
      .catch((err) => {
        logger.error('Authentication error:', err);
      });
  };

  const handleResetPassword = () => {
    if (!email) {
      setValidationErrors({ email: 'Veuillez saisir votre email' });
      return;
    }

    if (!validateEmail(email)) {
      setValidationErrors({ email: 'Format d\'email invalide' });
      return;
    }

    resetPassword(email)
      .then(() => {
        setResetEmailSent(true);
      })
      .catch((err) => {
        logger.error('Reset password error:', err);
      });
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-transparent py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <button
              onClick={onBackToHome}
              className="flex items-center space-x-2 text-text-primary hover:text-accent-gold transition-smooth"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Retour à l'accueil</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-accent-blue" />
              <span className="text-2xl font-bold text-accent-blue font-playfair">PilotImmo</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-text-primary hover:text-accent-gold transition-smooth">Accueil</a>
              <a href="#" className="text-text-primary hover:text-accent-gold transition-smooth">Contact</a>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-accent-gold hover:text-accent-blue transition-smooth font-medium"
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-accent-blue to-accent-green">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white font-playfair mb-6">
            {isLogin ? 'Bienvenue sur PilotImmo' : 'Rejoignez PilotImmo'}
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            {isLogin 
              ? 'Accédez à votre tableau de bord et gérez vos biens LMNP en toute simplicité'
              : 'Simplifiez votre gestion locative meublée avec notre plateforme innovante'
            }
          </p>
        </div>
      </section>

      {/* Auth Form Section */}
      <section className="py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-bg-card rounded-default shadow-card border border-border-light p-8">
            <div className="text-center mb-8">
              <h2 className="text-title text-text-primary font-playfair mb-2">
                {isLogin ? 'Connexion' : 'Inscription'}
              </h2>
              <p className="text-body text-gray-600">
                {isLogin 
                  ? 'Connectez-vous à votre espace personnel' 
                  : 'Créez votre compte et commencez votre essai gratuit'
                }
              </p>
            </div>

            {/* Error Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-default p-4 mb-6">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {resetEmailSent && (
              <div className="bg-accent-green bg-opacity-10 border border-accent-green rounded-default p-4 mb-6">
                <p className="text-accent-green text-sm">
                  Un email de réinitialisation a été envoyé à votre adresse.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Registration Fields */}
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">
                      Prénom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-default focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-smooth ${
                          validationErrors.firstName ? 'border-red-500' : 'border-border-light'
                        }`}
                        placeholder="Votre prénom"
                      />
                    </div>
                    {validationErrors.firstName && (
                      <p className="text-red-600 text-xs mt-1">{validationErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">
                      Nom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-default focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-smooth ${
                          validationErrors.lastName ? 'border-red-500' : 'border-border-light'
                        }`}
                        placeholder="Votre nom"
                      />
                    </div>
                    {validationErrors.lastName && (
                      <p className="text-red-600 text-xs mt-1">{validationErrors.lastName}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Adresse email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-default focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-smooth ${
                      validationErrors.email ? 'border-red-500' : 'border-border-light'
                    }`}
                    placeholder="votre@email.com"
                    required
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>

              {/* Phone Field (Registration only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    Téléphone (optionnel)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-border-light rounded-default focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-smooth"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-default focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-smooth ${
                      validationErrors.password ? 'border-red-500' : 'border-border-light'
                    }`}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-accent-gold transition-smooth"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.password}</p>
                )}
              </div>

              {/* Confirm Password (Registration only) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    Confirmer le mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-default focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-smooth ${
                        validationErrors.confirmPassword ? 'border-red-500' : 'border-border-light'
                      }`}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="text-red-600 text-xs mt-1">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              )}

              {/* Registration Options */}
              {!isLogin && (
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="enable2fa"
                      checked={enable2FA}
                      onChange={(e) => setEnable2FA(e.target.checked)}
                      className="mt-1 h-4 w-4 text-accent-blue focus:ring-accent-blue border-border-light rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="enable2fa" className="text-sm font-medium text-text-primary flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-accent-green" />
                        Activer l'authentification à deux facteurs (recommandé)
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Sécurisez votre compte avec une couche de protection supplémentaire
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 text-accent-blue focus:ring-accent-blue border-border-light rounded"
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-text-primary">
                      J'accepte les{' '}
                      <a href="#" className="text-accent-gold hover:text-accent-blue transition-smooth hover:underline">
                        conditions d'utilisation
                      </a>{' '}
                      et la{' '}
                      <a href="#" className="text-accent-gold hover:text-accent-blue transition-smooth hover:underline">
                        politique de confidentialité
                      </a>
                    </label>
                  </div>
                  {validationErrors.terms && (
                    <p className="text-red-600 text-xs">{validationErrors.terms}</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent-blue text-text-secondary py-3 rounded-default font-semibold hover:bg-blue-800 focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'Créer mon compte')}
              </button>
            </form>

            {/* Security Badge (Registration only) */}
            {!isLogin && (
              <div className="mt-6 p-4 bg-accent-green bg-opacity-10 border border-accent-green rounded-default">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="h-5 w-5 text-accent-green" />
                  <span className="font-semibold text-accent-green">Sécurité garantie</span>
                </div>
                <ul className="text-sm text-accent-green space-y-1">
                  <li>• Chiffrement SSL/TLS de toutes vos données</li>
                  <li>• Conformité RGPD et hébergement français</li>
                  <li>• Sauvegarde automatique et redondante</li>
                </ul>
              </div>
            )}

            {/* Toggle Auth Mode */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-accent-gold hover:text-accent-blue font-medium transition-smooth hover:underline"
              >
                {isLogin 
                  ? "Pas encore de compte ? S'inscrire" 
                  : "Déjà un compte ? Se connecter"
                }
              </button>
            </div>

            {/* Forgot Password (Login only) */}
            {isLogin && (
              <div className="mt-4 text-center">
                <button 
                  onClick={handleResetPassword}
                  className="text-sm text-accent-gold hover:text-accent-blue transition-smooth hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-bg-sidebar text-text-secondary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-6 w-6 text-accent-gold" />
                <span className="text-xl font-bold font-playfair">PilotImmo</span>
              </div>
              <p className="text-gray-400">
                La solution complète pour optimiser votre gestion locative LMNP
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Fonctionnalités</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Déclarations LMNP</a></li>
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Gestion des biens</a></li>
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Optimisation fiscale</a></li>
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Documents automatiques</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Formation</a></li>
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Communauté</a></li>
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Mentions légales</a></li>
                <li><a href="#" className="hover:text-accent-gold transition-smooth">RGPD</a></li>
                <li><a href="#" className="hover:text-accent-gold transition-smooth">CGU</a></li>
                <li><a href="#" className="hover:text-accent-gold transition-smooth">Sécurité</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 PilotImmo. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}