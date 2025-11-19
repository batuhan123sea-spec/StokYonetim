import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardStats } from '@/types';
import { Package, Users, ShoppingCart, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { ExchangeRatesWidget } from '@/components/dashboard/ExchangeRatesWidget';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    todaySales: 0,
    pendingBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [productsRes, allProductsRes, customersRes, salesRes, todaySalesRes, balanceRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('stock_quantity, min_stock_level'),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('total_amount').eq('is_reserved', false),
        supabase.from('sales').select('total_amount').eq('is_reserved', false).gte('sale_date', today.toISOString()),
        supabase.from('customers').select('current_balance'),
      ]);

      // Calculate low stock count in JavaScript
      const lowStockCount = allProductsRes.data?.filter(
        (p) => p.stock_quantity <= p.min_stock_level
      ).length || 0;

      const totalSales = salesRes.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const todaySales = todaySalesRes.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const pendingBalance = balanceRes.data?.reduce((sum, customer) => sum + Number(customer.current_balance), 0) || 0;

      setStats({
        totalProducts: productsRes.count || 0,
        lowStockProducts: lowStockCount,
        totalCustomers: customersRes.count || 0,
        totalSales,
        todaySales,
        pendingBalance,
      });
    } catch (error: any) {
      toast.error('Veriler yüklenirken hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Toplam Ürün',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Düşük Stok',
      value: stats.lowStockProducts,
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Toplam Müşteri',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Bugünkü Satış',
      value: formatCurrency(stats.todaySales),
      icon: ShoppingCart,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Toplam Satış',
      value: formatCurrency(stats.totalSales),
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Bekleyen Bakiye',
      value: formatCurrency(stats.pendingBalance),
      icon: DollarSign,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">İşletmenizin genel durumunu görüntüleyin</p>
      </div>

      {/* Exchange Rates Widget */}
      <ExchangeRatesWidget />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">{card.title}</p>
                  <p className="text-2xl font-bold mt-2">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {stats.lowStockProducts > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-warning">Stok Uyarısı</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.lowStockProducts} ürününüz minimum stok seviyesinin altında. Lütfen stok yönetimi bölümünden kontrol edin.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
