import { Bell, Search } from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ürün, müşteri veya kategori ara..."
            className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-medium">Kullanıcı</p>
            <p className="text-xs text-muted-foreground">Yönetici</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">K</span>
          </div>
        </div>
      </div>
    </header>
  );
}
