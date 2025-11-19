import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCurrentUserId } from '@/lib/constants';
import { Supplier } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Trash2, Plus } from 'lucide-react';

interface ProductSupplier {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  unit_price: number;
  currency: string;
  last_purchase_date?: string;
}

interface ProductSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  onSaved: () => void;
}

export function ProductSupplierDialog({ 
  open, 
  onOpenChange, 
  productId, 
  productName,
  onSaved 
}: ProductSupplierDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>([]);
  const [newSupplierId, setNewSupplierId] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState('');
  const [newCurrency, setNewCurrency] = useState('TRY');

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, productId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData || []);

      // Load product suppliers with supplier info
      const { data: productSuppliersData, error: productSuppliersError } = await supabase
        .from('product_suppliers')
        .select('*, suppliers(name)')
        .eq('product_id', productId);

      if (productSuppliersError) throw productSuppliersError;

      const formattedData = (productSuppliersData || []).map((ps: any) => ({
        id: ps.id,
        supplier_id: ps.supplier_id,
        supplier_name: ps.suppliers?.name,
        unit_price: ps.unit_price,
        currency: ps.currency,
        last_purchase_date: ps.last_purchase_date,
      }));

      setProductSuppliers(formattedData);
    } catch (error: any) {
      toast.error('Veriler yüklenirken hata: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierId || !newUnitPrice) {
      toast.error('Tedarikçi ve fiyat gereklidir');
      return;
    }

    const unitPrice = parseFloat(newUnitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      toast.error('Geçersiz fiyat');
      return;
    }

    // Check if already exists
    const exists = productSuppliers.find(ps => ps.supplier_id === newSupplierId);
    if (exists) {
      toast.error('Bu tedarikçi zaten eklenmiş');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('product_suppliers').insert({
        user_id: getCurrentUserId(),
        product_id: productId,
        supplier_id: newSupplierId,
        unit_price: unitPrice,
        currency: newCurrency,
        last_purchase_date: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Tedarikçi eklendi');
      setNewSupplierId('');
      setNewUnitPrice('');
      setNewCurrency('TRY');
      loadData();
      onSaved();
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('product_suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Tedarikçi silindi');
      loadData();
      onSaved();
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getBestPrice = () => {
    if (productSuppliers.length === 0) return null;
    
    // Convert all prices to TRY for comparison (simplified)
    const prices = productSuppliers.map(ps => ({
      ...ps,
      priceInTRY: ps.currency === 'TRY' ? ps.unit_price : ps.unit_price * (ps.currency === 'USD' ? 30 : 32),
    }));

    return prices.reduce((best, current) => 
      current.priceInTRY < best.priceInTRY ? current : best
    );
  };

  const bestPrice = getBestPrice();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tedarikçi Yönetimi - {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Supplier */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Yeni Tedarikçi Ekle</h3>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5">
                <Label>Tedarikçi</Label>
                <Select value={newSupplierId} onValueChange={setNewSupplierId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tedarikçi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label>Birim Fiyat</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newUnitPrice}
                  onChange={(e) => setNewUnitPrice(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="col-span-2">
                <Label>Para Birimi</Label>
                <Select value={newCurrency} onValueChange={setNewCurrency} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">₺ TRY</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                    <SelectItem value="EUR">€ EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-end">
                <Button onClick={handleAddSupplier} disabled={loading} className="w-full">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Existing Suppliers */}
          {productSuppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz tedarikçi eklenmemiş
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold">Kayıtlı Tedarikçiler</h3>
              
              {/* Best Price Highlight */}
              {bestPrice && (
                <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                  <p className="text-sm text-success font-semibold">
                    ✓ En İyi Fiyat: {bestPrice.supplier_name} - {formatCurrency(bestPrice.unit_price)} {bestPrice.currency}
                  </p>
                </div>
              )}

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold">Tedarikçi</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold">Birim Fiyat</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">Para Birimi</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">Son Alış</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productSuppliers.map((ps) => (
                      <tr 
                        key={ps.id} 
                        className={`border-t border-border ${bestPrice?.id === ps.id ? 'bg-success/5' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm">
                          {ps.supplier_name}
                          {bestPrice?.id === ps.id && (
                            <span className="ml-2 text-xs text-success font-semibold">EN İYİ</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">
                          {formatCurrency(ps.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">{ps.currency}</td>
                        <td className="px-4 py-3 text-sm text-center text-muted-foreground">
                          {ps.last_purchase_date 
                            ? new Date(ps.last_purchase_date).toLocaleDateString('tr-TR')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSupplier(ps.id)}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
