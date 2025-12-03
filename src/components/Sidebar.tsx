import {
  Building2,
  LayoutDashboard,
  Home, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Users,
  Calculator,
  Scale,
  Settings,
  HelpCircle,
  BookOpen,
  MessageCircle,
  Zap,
  Bell
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  notificationCount: number;
}

export function Sidebar({ currentPage, onPageChange, notificationCount }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'properties', label: 'Mes biens LMNP', icon: Home },
    { id: 'tenants', label: 'Locataires', icon: Users },
    { id: 'recettes', label: 'Recettes', icon: TrendingUp },
    { id: 'depenses', label: 'Dépenses', icon: TrendingDown },
    { id: 'amortissements', label: 'Amortissements', icon: Calculator },
    { id: 'declarations', label: 'Déclarations', icon: FileText },
    { id: 'reports', label: 'États comptables', icon: Scale },
    { id: 'marketplace', label: 'Marketplace', icon: MessageCircle },
    { id: 'formations', label: 'Formations', icon: BookOpen },
    { id: 'communaute', label: 'Communauté', icon: Users },
  ];

  const bottomMenuItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Paramètres', icon: Settings },
    { id: 'help', label: 'Aide', icon: HelpCircle },
  ];

  return (
    <div className="w-64 bg-bg-sidebar flex flex-col h-screen">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-accent-gold transition-smooth" />
          <span className="text-xl font-bold text-text-secondary font-playfair">PilotImmo</span>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Gestion LMNP
          </h3>
          <ul className="space-y-2">
            {menuItems.slice(0, 7).map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onPageChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth text-left ${
                      isActive 
                        ? 'bg-accent-blue text-text-secondary' 
                        : 'text-gray-300 hover:bg-gray-600 hover:text-text-secondary'
                    }`}
                  >
                    <Icon className={`h-5 w-5 transition-smooth ${isActive ? 'text-accent-gold' : 'hover:text-accent-gold'}`} />
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'amortissements' && (
                      <span className="ml-auto bg-accent-green text-text-secondary text-xs px-2 py-1 rounded-full">
                        Nouveau
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Services
          </h3>
          <ul className="space-y-2">
            {menuItems.slice(7).map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onPageChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth text-left ${
                      isActive 
                        ? 'bg-accent-blue text-text-secondary' 
                        : 'text-gray-300 hover:bg-gray-600 hover:text-text-secondary'
                    }`}
                  >
                    <Icon className={`h-5 w-5 transition-smooth ${isActive ? 'text-accent-gold' : 'hover:text-accent-gold'}`} />
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'formations' && (
                      <span className="ml-auto bg-accent-green text-text-secondary text-xs px-2 py-1 rounded-full">
                        Nouveau
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-600">
        <ul className="space-y-2">
          {bottomMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth text-left ${
                    isActive
                      ? 'bg-accent-blue text-text-secondary'
                      : 'text-gray-300 hover:bg-gray-600 hover:text-text-secondary'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-smooth ${isActive ? 'text-accent-gold' : 'hover:text-accent-gold'}`} />
                  <span className="font-medium">{item.label}</span>
                  {item.id === 'notifications' && notificationCount > 0 && (
                    <span className="ml-auto bg-accent-gold text-text-primary text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4">
        <button 
          onClick={() => console.log('Premium upgrade clicked')}
          className="w-full bg-accent-blue text-text-secondary p-4 rounded-lg text-center hover:bg-opacity-90 transition-smooth"
        >
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Zap className="h-5 w-5 text-accent-gold" />
            <span className="font-semibold">Premium</span>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            IA avancée, import automatique, support prioritaire
          </p>
          <div className="w-full bg-accent-gold text-text-primary py-2 rounded-lg font-semibold hover:bg-opacity-90 transition-smooth">
            Essai gratuit 30j
          </div>
        </button>
      </div>
    </div>
  );
}
