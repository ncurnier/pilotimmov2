import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { LandingPage } from '@/components/LandingPage';
import { AuthPage } from '@/components/AuthPage';
import { Dashboard } from '@/components/Dashboard';
import { PropertiesPage } from '@/components/PropertiesPage';
import { TenantsPage } from '@/components/TenantsPage';
import { RecettesPage } from '@/components/RecettesPage';
import { DepensesPage } from '@/components/DepensesPage';
import { AmortissementsPage } from '@/components/AmortissementsPage';
import { DeclarationsPage } from '@/components/DeclarationsPage';
import { MarketplacePage } from '@/components/MarketplacePage';
import { FormationsPage } from '@/components/FormationsPage';
import { CommunautePage } from '@/components/CommunautePage';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { AccountingReportsPage } from '@/components/AccountingReportsPage';
import logger from '@/utils/logger';


function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const { notifications } = useSupabase();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (user) {
      logger.info('User authenticated:', user.email);
    }
  }, [user]);

  // Affichage du chargement
  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-text-primary">Chargement...</p>
        </div>
      </div>
    );
  }

  // Page d'accueil pour les utilisateurs non connectés
  if (!user && !showAuth) {
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // Page d'authentification
  if (!user && showAuth) {
    return (
      <AuthPage 
        onLogin={() => {
          setShowAuth(false);
          setCurrentPage('dashboard');
        }}
        onBackToHome={() => setShowAuth(false)}
      />
    );
  }

  // Application principale pour les utilisateurs connectés
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />;
      case 'properties':
        return <PropertiesPage onPageChange={setCurrentPage} />;
      case 'tenants':
        return <TenantsPage />;
      case 'recettes':
        return <RecettesPage />;
      case 'depenses':
        return <DepensesPage />;
      case 'amortissements':
        return <AmortissementsPage />;
      case 'declarations':
        return <DeclarationsPage onPageChange={setCurrentPage} />;
      case 'marketplace':
        return <MarketplacePage />;
      case 'formations':
        return <FormationsPage />;
      case 'communaute':
        return <CommunautePage />;
      case 'reports':
        return <AccountingReportsPage />;
      case 'notifications':
        return (
          <PlaceholderPage
            title="Notifications"
            description="Page des notifications en cours de développement"
          />
        );
      case 'settings':
        return (
          <PlaceholderPage
            title="Paramètres"
            description="Page des paramètres en cours de développement"
          />
        );
      case 'help':
        return (
          <PlaceholderPage
            title="Centre d'aide"
            description="Centre d'aide en cours de développement"
          />
        );
      case 'amortissements_new':
        return (
          <PlaceholderPage
            title="Nouvel amortissement"
            description="Ajoutez un équipement à amortir selon les règles LMNP. Fonctionnalité en cours de développement."
            actionLabel="Retour aux amortissements"
            onAction={() => setCurrentPage('amortissements')}
          />
        );

      default:
        return <Dashboard onPageChange={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage}
        notificationCount={notifications.length}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={user ? {
            name: user.displayName || 'Utilisateur',
            email: user.email || ''
          } : null}
          onLogout={logout}
          onPageChange={setCurrentPage}
        />
        <main className="flex-1 overflow-y-auto">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
