import { Building2, Calculator, Shield, TrendingUp, Users, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-bg-card border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-accent-blue" />
              <span className="text-2xl font-bold text-accent-blue font-playfair">PilotImmo</span>
            </div>
            <button
              onClick={onGetStarted}
              className="bg-accent-blue text-text-secondary px-6 py-2 rounded-default hover:bg-blue-800 transition-smooth font-medium"
            >
              Se connecter
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-accent-blue to-accent-green py-20 relative">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center relative">
            <h1 className="text-5xl font-bold text-white font-playfair mb-6">
              Simplifiez votre gestion locative
              <span className="text-accent-gold"> LMNP</span>
            </h1>
            <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
              La plateforme digitale qui révolutionne la gestion fiscale et juridique 
              des bailleurs meublés. Optimisez vos revenus, sécurisez vos déclarations.
            </p>
            <button
              onClick={onGetStarted}
              className="bg-accent-gold text-text-primary px-8 py-4 rounded-default text-lg font-semibold hover:bg-yellow-600 transition-smooth shadow-card"
            >
              Commencer gratuitement
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary font-playfair mb-4">
              Tout ce dont vous avez besoin pour gérer votre patrimoine
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              Des outils intuitifs et performants pour optimiser votre rentabilité locative
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-default bg-bg-card hover:shadow-card transition-smooth border border-border-light">
              <Calculator className="h-12 w-12 text-accent-blue mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-3">Déclarations automatisées</h3>
              <p className="text-gray-600">
                Générez vos déclarations LMNP en quelques clics avec notre assistant intelligent
              </p>
            </div>

            <div className="text-center p-8 rounded-default bg-bg-card hover:shadow-card transition-smooth border border-border-light">
              <TrendingUp className="h-12 w-12 text-accent-green mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-3">Optimisation fiscale</h3>
              <p className="text-gray-600">
                Maximisez vos déductions et optimisez votre fiscalité avec nos simulateurs
              </p>
            </div>

            <div className="text-center p-8 rounded-default bg-bg-card hover:shadow-card transition-smooth border border-border-light">
              <Shield className="h-12 w-12 text-accent-gold mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-3">Conformité garantie</h3>
              <p className="text-gray-600">
                Restez en conformité avec la législation grâce à notre veille réglementaire
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-text-primary font-playfair mb-6">
                Pourquoi choisir PilotImmo ?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-accent-green mt-1" />
                  <div>
                    <h3 className="font-semibold text-text-primary">Interface intuitive</h3>
                    <p className="text-gray-600">Design moderne et navigation simplifiée</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-accent-green mt-1" />
                  <div>
                    <h3 className="font-semibold text-text-primary">IA intégrée</h3>
                    <p className="text-gray-600">Assistance intelligente pour vos déclarations</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-accent-green mt-1" />
                  <div>
                    <h3 className="font-semibold text-text-primary">Import automatique</h3>
                    <p className="text-gray-600">Synchronisation avec vos données bancaires</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-accent-green mt-1" />
                  <div>
                    <h3 className="font-semibold text-text-primary">Sécurité renforcée</h3>
                    <p className="text-gray-600">Conformité RGPD et chiffrement des données</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-bg-primary p-8 rounded-default shadow-card border border-border-light">
              <div className="text-center">
                <Users className="h-16 w-16 text-accent-blue mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-text-primary mb-2">+10,000</h3>
                <p className="text-gray-600 mb-4">Bailleurs nous font confiance</p>
                <div className="flex justify-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-5 h-5 bg-accent-gold rounded-full"></div>
                  ))}
                </div>
                <p className="text-sm text-gray-500">4.9/5 de satisfaction</p>
              </div>
            </div>
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