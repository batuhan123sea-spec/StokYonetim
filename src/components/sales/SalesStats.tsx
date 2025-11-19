import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';

export function SalesStats() {
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const now = new Date();
      
      // Today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      // This week (Monday to Sunday)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      
      // This month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);

      // Fetch sales
      const { data: sales, error } = await supabase
        .from('sales')
        .select('total_amount, fx_rate, sale_date')
        .eq('is_reserved', false)
        .eq('odeme_durumu', 'ODEME_YAPILDI')
        .gte('sale_date', monthStart.toISOString());

      if (error) throw error;

      // Calculate totals in TRY
      let todayTotal = 0;
      let weekTotal = 0;
      let monthTotal = 0;

      sales?.forEach(sale => {
        const amount = Number(sale.total_amount);
        const fxRate = Number(sale.fx_rate) || 1.0;
        const amountInTRY = amount * fxRate;
        const saleDate = new Date(sale.sale_date);

        if (saleDate >= monthStart) {
          monthTotal += amountInTRY;
        }
        if (saleDate >= weekStart) {
          weekTotal += amountInTRY;
        }
        if (saleDate >= todayStart) {
          todayTotal += amountInTRY;
        }
      });

      setStats({
        today: todayTotal,
        week: weekTotal,
        month: monthTotal,
      });
    } catch (error) {
      console.error('Stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="p-5 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Bugünkü Satış</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.today)}</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Bu Hafta</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.week)}</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-purple-600" />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Bu Ay</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.month)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
