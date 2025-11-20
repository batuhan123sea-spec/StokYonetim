import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { AlertCircle, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface StockAlertsProps {
  onProductClick?: (product: Product) => void;
}

export function StockAlerts({ onProductClick }: StockAlertsProps) {
  const [alerts, setAlerts] = useState<{
    critical: Product[];
    low: Product[];
    adequate: Product[];
  }>({
    critical: [],
    low: [],
    adequate: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('stock_quantity', { ascending: true });

      if (error) throw error;

      const critical: Product[] = [];
      const low: Product[] = [];
      const adequate: Product[] = [];

      products?.forEach((product) => {
        const minStock = product.min_stock_level || 10;
        const stock = product.stock_quantity;

        if (stock === 0 || stock < minStock) {
          critical.push(product);
        } else if (stock < minStock * 2) {
          low.push(product);
        } else {
          adequate.push(product);
        }
      });

      setAlerts({ critical, low, adequate });
    } catch (error) {
      console.error('Stock alerts error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Critical Stock Alert */}
      {alerts.critical.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-red-500/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-700">Kritik Stok Uyarısı</h3>
              <p className="text-xs text-red-600">{alerts.critical.length} ürün kritik seviyede!</p>
            </div>
          </div>
          <div className="space-y-2">
            {alerts.critical.slice(0, 5).map((product) => (
              <button
                key={product.id}
                onClick={() => onProductClick?.(product)}
                className="w-full flex items-center justify-between p-2 bg-background/50 hover:bg-background rounded border border-red-500/20 hover:border-red-500/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Min: {product.min_stock_level || 10} | Fiyat: {formatCurrency(product.sale_price)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-700 rounded-full text-xs font-semibold">
                    {product.stock_quantity === 0 ? 'STOK YOK!' : `${product.stock_quantity} Adet`}
                  </span>
                </div>
              </button>
            ))}
            {alerts.critical.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{alerts.critical.length - 5} ürün daha...
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Low Stock Alert */}
      {alerts.low.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-700">Az Stok Uyarısı</h3>
              <p className="text-xs text-yellow-600">{alerts.low.length} ürün az stokta</p>
            </div>
          </div>
          <div className="space-y-2">
            {alerts.low.slice(0, 3).map((product) => (
              <button
                key={product.id}
                onClick={() => onProductClick?.(product)}
                className="w-full flex items-center justify-between p-2 bg-background/50 hover:bg-background rounded border border-yellow-500/20 hover:border-yellow-500/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Min: {product.min_stock_level || 10}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-700 rounded-full text-xs font-semibold">
                    {product.stock_quantity} Adet
                  </span>
                </div>
              </button>
            ))}
            {alerts.low.length > 3 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{alerts.low.length - 3} ürün daha...
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Stok Durumu Özeti</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">{alerts.critical.length}</p>
            <p className="text-xs text-red-600">Kritik</p>
          </div>
          <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-600">{alerts.low.length}</p>
            <p className="text-xs text-yellow-600">Az</p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">{alerts.adequate.length}</p>
            <p className="text-xs text-green-600">Yeterli</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
