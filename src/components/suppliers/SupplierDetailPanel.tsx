import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Package, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Supplier } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface SupplierProduct {
  id: string;
  product_id: string;
  product_name: string;
  product_barcode?: string;
  unit_price: number;
  currency: string;
  fx_rate_at_purchase: number;
  last_purchase_date?: string;
  current_stock?: number;
}

interface SupplierDetailPanelProps {
  supplier: Supplier;
  onClose: () => void;
}

export function SupplierDetailPanel({ supplier, onClose }: SupplierDetailPanelProps) {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSupplierProducts();
  }, [supplier.id]);

  const loadSupplierProducts = async () => {
    setLoading(true);
    try {
      // Load all products from this supplier with product details
      const { data: productSuppliersData, error } = await supabase
        .from('product_suppliers')
        .select(`
          id,
          product_id,
          unit_price,
          currency,
          fx_rate_at_purchase,
          last_purchase_date,
          products(name, barcode, stock_quantity)
        `)
        .eq('supplier_id', supplier.id)
        .order('last_purchase_date', { ascending: false });

      if (error) throw error;

      const formattedProducts: SupplierProduct[] = (productSuppliersData || []).map((ps: any) => ({
        id: ps.id,
        product_id: ps.product_id,
        product_name: ps.products?.name || 'Bilinmeyen Ürün',
        product_barcode: ps.products?.barcode,
        unit_price: ps.unit_price,
        currency: ps.currency,
        fx_rate_at_purchase: ps.fx_rate_at_purchase || 1.0,
        last_purchase_date: ps.last_purchase_date,
        current_stock: ps.products?.stock_quantity,
      }));

      setProducts(formattedProducts);
    } catch (error: any) {
      toast.error('Ürünler yüklenirken hata: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalProducts: products.length,
    totalValue: products.reduce((sum, p) => {
      const priceInTRY = p.currency === 'TRY' ? p.unit_price : p.unit_price * p.fx_rate_at_purchase;
      return sum + (priceInTRY * (p.current_stock || 0));
    }, 0),
    lastPurchase: products.length > 0 && products[0].last_purchase_date
      ? new Date(products[0].last_purchase_date).toLocaleDateString('tr-TR')
      : 'Henüz alış yok',
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-2/3 bg-card border-l border-border shadow-2xl overflow-y-auto z-50 scrollbar-thin">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10 shadow-sm backdrop-blur-sm bg-opacity-95">
        <div>
          <h2 className="text-2xl font-bold">{supplier.name}</h2>
          <p className="text-sm text-muted-foreground">Tedarikçi Detayları & Ürün Listesi</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Supplier Info Card */}
        <Card className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              {supplier.contact_person && (
                <div>
                  <p className="text-xs text-muted-foreground">Yetkili Kişi</p>
                  <p className="font-semibold">{supplier.contact_person}</p>
                </div>
              )}
              {supplier.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  <p className="font-semibold">{supplier.phone}</p>
                </div>
              )}
              {supplier.email && (
                <div>
                  <p className="text-xs text-muted-foreground">E-posta</p>
                  <p className="font-semibold">{supplier.email}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {supplier.address && (
                <div>
                  <p className="text-xs text-muted-foreground">Adres</p>
                  <p className="font-semibold text-sm">{supplier.address}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Toplam Ürün</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalProducts}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Stok Değeri</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Son Alış</p>
                <p className="text-sm font-bold text-orange-600">{stats.lastPurchase}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Products List */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Tedarikçiden Alınan Ürünler ({products.length})
          </h3>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-muted-foreground text-sm">Yükleniyor...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Bu tedarikçiden henüz ürün alınmamış</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold">Ürün Adı</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold">Barkod</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold">Birim Fiyat</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold">Para Birimi</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold">TL Karşılığı</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold">Mevcut Stok</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold">Son Alış Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const priceInTRY = product.currency === 'TRY' 
                      ? product.unit_price 
                      : product.unit_price * product.fx_rate_at_purchase;
                    
                    const totalValue = priceInTRY * (product.current_stock || 0);

                    return (
                      <tr key={product.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{product.product_name}</td>
                        <td className="px-4 py-3 text-center">
                          {product.product_barcode ? (
                            <code className="text-xs bg-secondary px-2 py-1 rounded">
                              {product.product_barcode}
                            </code>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(product.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 rounded">
                            {product.currency}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-sm">
                          {product.currency === 'TRY' ? (
                            '-'
                          ) : (
                            <div>
                              <div className="font-semibold text-foreground">{formatCurrency(priceInTRY)}</div>
                              <div className="text-xs">@ {product.fx_rate_at_purchase.toFixed(2)}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div>
                            <div className="font-semibold">{product.current_stock || 0}</div>
                            {product.current_stock && product.current_stock > 0 && (
                              <div className="text-xs text-muted-foreground">
                                ≈ {formatCurrency(totalValue)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                          {product.last_purchase_date ? (
                            <div className="flex items-center justify-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(product.last_purchase_date).toLocaleDateString('tr-TR')}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-secondary/50 border-t-2 border-primary">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right font-semibold">
                      Toplam Stok Değeri:
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-center">
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(stats.totalValue)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        {/* Purchase History Summary */}
        {products.length > 0 && (
          <Card className="p-5 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-purple-700">
              <TrendingDown className="w-5 h-5" />
              Alış Özeti
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">TRY Cinsinden</p>
                <p className="font-bold text-lg">
                  {products.filter(p => p.currency === 'TRY').length} ürün
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">USD Cinsinden</p>
                <p className="font-bold text-lg">
                  {products.filter(p => p.currency === 'USD').length} ürün
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">EUR Cinsinden</p>
                <p className="font-bold text-lg">
                  {products.filter(p => p.currency === 'EUR').length} ürün
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
