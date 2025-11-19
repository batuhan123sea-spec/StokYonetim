import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Euro, Coins, RefreshCw } from 'lucide-react';
import { fetchExchangeRatesWithFallback, formatRate, ExchangeRates } from '@/lib/exchangeRates';
import { toast } from 'sonner';

export function ExchangeRatesWidget() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  useEffect(() => {
    loadRates();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadRates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadRates = async () => {
    setLoading(true);
    try {
      const data = await fetchExchangeRatesWithFallback();
      setRates(data);
      setLastUpdateTime(new Date(data.lastUpdate).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      }));
      console.log('📊 Kurlar güncellendi:', {
        USD: data.usd.selling,
        EUR: data.eur.selling,
        Altın: data.gold.selling,
      });
    } catch (error) {
      toast.error('Kurlar yüklenemedi, varsayılan değerler gösteriliyor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !rates) {
    return (
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!rates) return null;

  const rateItems = [
    {
      name: 'Dolar',
      icon: DollarSign,
      symbol: '$',
      buying: rates.usd.buying,
      selling: rates.usd.selling,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Euro',
      icon: Euro,
      symbol: '€',
      buying: rates.eur.buying,
      selling: rates.eur.selling,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Altın (gr)',
      icon: Coins,
      symbol: '🪙',
      buying: rates.gold.buying,
      selling: rates.gold.selling,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <Card className="p-5 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border-primary/20 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Canlı Döviz Kurları
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Satış Fiyatı Baz • Son güncelleme: {lastUpdateTime}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadRates}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {rateItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className="relative overflow-hidden rounded-lg border border-border bg-card p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded ${item.bgColor}`}>
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                </div>
                <span className="text-xs font-medium">{item.name}</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Alış:</span>
                  <span className="text-sm font-semibold">₺{formatRate(item.buying)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Satış:</span>
                  <span className="text-base font-bold text-primary">₺{formatRate(item.selling)}</span>
                </div>
              </div>

              {/* Decorative element */}
              <div className="absolute -right-2 -bottom-2 opacity-5 text-4xl">
                {item.symbol}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          * Kurlar anlık olarak güncellenmektedir. Resmi kurlar için bankanıza danışınız.
        </p>
      </div>
    </Card>
  );
}
