import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  FileText,
  Zap,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Satış (Hızlı)', icon: ShoppingCart, highlight: true },
    { id: 'reserves', label: 'Rezerve Fişler', icon: FileText },
    { id: 'stock', label: 'Stok Yönetimi', icon: Package },
    { id: 'customers', label: 'Müşteriler & Tahsilat', icon: Users },
    { id: 'suppliers', label: 'Tedarikçiler', icon: TrendingUp },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border h-screen flex flex-col">
      <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
        <h1 className="text-xl font-bold">Stok Yönetim</h1>
        <p className="text-xs text-muted-foreground mt-1">Envanter Sistemi</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'sidebar-item w-full',
                activeTab === item.id && 'active',
                item.highlight && 'ring-2 ring-primary/50 font-semibold shadow-lg shadow-primary/20'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.highlight && <Zap className="w-4 h-4 ml-auto text-primary animate-pulse" />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
