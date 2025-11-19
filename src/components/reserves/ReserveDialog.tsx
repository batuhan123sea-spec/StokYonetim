import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Product, Customer } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ReserveItem {
  product_id: string;
  product_name: string;
  qty_reserved: number;
  unit_price: number;
}

interface ReserveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ReserveDialog({ open, onOpenChange, onSaved }: ReserveDialogProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<ReserveItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [customerId, setCustomerId] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    const [productsRes, customersRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
    ]);

    setProducts(productsRes.data || []);
    setCustomers(customersRes.data || []);
  };

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error('Miktar 0\'dan büyük olmalıdır');
      return;
    }

    setItems([
      ...items,
      {
        product_id: product.id,
        product_name: product.name,
        qty_reserved: qty,
        unit_price: product.sale_price,
      },
    ]);

    setSelectedProduct('');
    setQuantity('1');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('En az bir ürün ekleyin');
      return;
    }

    setLoading(true);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays));

      // Create reserve
      const { data: reserve, error: reserveError } = await supabase
        .from('reserves')
        .insert({
          customer_id: customerId || null,
          expires_at: expiresAt.toISOString(),
          status: 'open',
        })
        .select()
        .single();

      if (reserveError) throw reserveError;

      // Create reserve items
      const { error: itemsError } = await supabase.from('reserve_items').insert(
        items.map((item) => ({
          reserve_id: reserve.id,
          product_id: item.product_id,
          qty_reserved: item.qty_reserved,
          unit_price: item.unit_price,
        }))
      );

      if (itemsError) throw itemsError;

      toast.success('Rezerve fiş oluşturuldu: ' + reserve.reserve_no);
      setItems([]);
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.qty_reserved * item.unit_price, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Rezerve Fiş Oluştur</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Selection */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Ürün Ekle</h3>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-7">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ürün seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.sale_price)} (Stok: {product.stock_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  placeholder="Miktar"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                />
              </div>
              <div className="col-span-2">
                <Button type="button" onClick={addItem} className="w-full" disabled={!selectedProduct}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold">Ürün</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold">Miktar</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold">Birim Fiyat</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold">Toplam</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="px-4 py-2 text-sm">{item.product_name}</td>
                      <td className="px-4 py-2 text-sm text-right">{item.qty_reserved}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold">
                        {formatCurrency(item.qty_reserved * item.unit_price)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-primary bg-secondary/50">
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                      Toplam Tutar:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-primary">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Reserve Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Müşteri (Opsiyonel)</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_days">Son Kullanım (Gün)</Label>
              <Input
                id="expiry_days"
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                min="1"
                max="30"
              />
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              ℹ️ Rezerve fiş stoktan düşmez. Müşteri ürünleri test ettikten sonra "Satışa Çevir" ile stok
              güncellenir.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading || items.length === 0}>
              {loading ? 'Oluşturuluyor...' : 'Rezerve Fiş Oluştur'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
