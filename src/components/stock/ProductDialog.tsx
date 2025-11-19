import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCurrentUserId } from '@/lib/constants';
import { Product, Category, ProductUnit, Currency } from '@/types';
import { generateBarcode } from '@/lib/barcode';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  onSave: () => void;
}

export function ProductDialog({ open, onOpenChange, product, categories, onSave }: ProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const { rates, loading: ratesLoading } = useExchangeRates();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    unit: 'ADET' as ProductUnit,
    stock_quantity: '0',
    min_stock_level: '10',
    purchase_price: '0',
    purchase_currency: 'TRY' as Currency,
    sale_price: '0',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        category_id: product.category_id || '',
        unit: product.unit || 'ADET',
        stock_quantity: product.stock_quantity.toString(),
        min_stock_level: product.min_stock_level.toString(),
        purchase_price: product.purchase_price.toString(),
        purchase_currency: product.purchase_currency || 'TRY',
        sale_price: product.sale_price.toString(),
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category_id: '',
        unit: 'ADET',
        stock_quantity: '0',
        min_stock_level: '10',
        purchase_price: '0',
        purchase_currency: 'TRY',
        sale_price: '0',
      });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        toast.error('Ürün adı boş olamaz');
        setLoading(false);
        return;
      }

      const stockQty = parseInt(formData.stock_quantity);
      const minStock = parseInt(formData.min_stock_level);
      const purchasePrice = parseFloat(formData.purchase_price);
      const salePrice = parseFloat(formData.sale_price);

      if (isNaN(stockQty) || stockQty < 0) {
        toast.error('Geçersiz stok miktarı');
        setLoading(false);
        return;
      }

      if (isNaN(minStock) || minStock < 0) {
        toast.error('Geçersiz minimum stok seviyesi');
        setLoading(false);
        return;
      }

      if (isNaN(purchasePrice) || purchasePrice < 0) {
        toast.error('Geçersiz alış fiyatı');
        setLoading(false);
        return;
      }

      if (isNaN(salePrice) || salePrice < 0) {
        toast.error('Geçersiz satış fiyatı');
        setLoading(false);
        return;
      }

      // Calculate fx rate based on selected currency
      let fxRate = 1.0;
      if (formData.purchase_currency === 'USD') {
        fxRate = rates.USD;
      } else if (formData.purchase_currency === 'EUR') {
        fxRate = rates.EUR;
      }

      const productData = {
        user_id: getCurrentUserId(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        category_id: formData.category_id || null,
        unit: formData.unit,
        stock_quantity: stockQty,
        min_stock_level: minStock,
        purchase_price: purchasePrice,
        purchase_currency: formData.purchase_currency,
        purchase_fx_rate: fxRate,
        sale_price: salePrice,
        barcode: product?.barcode || generateBarcode(formData.name, 'system'),
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        if (error) throw error;
        toast.success('Ürün güncellendi');
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
        toast.success('Ürün eklendi');
      }

      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Ürün Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Birim *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value: ProductUnit) => setFormData({ ...formData, unit: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADET">Adet</SelectItem>
                  <SelectItem value="LITRE">Litre</SelectItem>
                  <SelectItem value="METRE">Metre</SelectItem>
                  <SelectItem value="GRAM">Gram</SelectItem>
                  <SelectItem value="CM">Santimetre (cm)</SelectItem>
                  <SelectItem value="KG">Kilogram (kg)</SelectItem>
                  <SelectItem value="M2">Metrekare (m²)</SelectItem>
                  <SelectItem value="M3">Metreküp (m³)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Stok Miktarı *</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock_level">Minimum Stok Seviyesi *</Label>
              <Input
                id="min_stock_level"
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="space-y-2 col-span-5">
              <Label htmlFor="purchase_price">Alış Fiyatı *</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                required
                disabled={loading}
              />
              {formData.purchase_currency !== 'TRY' && formData.purchase_price && !isNaN(parseFloat(formData.purchase_price)) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span>
                    ≈ {formatCurrency(parseFloat(formData.purchase_price) * (formData.purchase_currency === 'USD' ? rates.USD : rates.EUR))} TL
                    {ratesLoading && ' (hesaplanıyor...)'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="purchase_currency">Para Birimi</Label>
              <Select
                value={formData.purchase_currency}
                onValueChange={(value: Currency) => setFormData({ ...formData, purchase_currency: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">₺ TRY</SelectItem>
                  <SelectItem value="USD">$ USD ({rates.USD.toFixed(2)} TL)</SelectItem>
                  <SelectItem value="EUR">€ EUR ({rates.EUR.toFixed(2)} TL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-5">
              <Label htmlFor="sale_price">Satış Fiyatı (₺) *</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
