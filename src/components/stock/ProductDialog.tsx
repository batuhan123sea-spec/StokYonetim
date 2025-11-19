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
import { Product, Category } from '@/types';
import { generateBarcode } from '@/lib/barcode';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  onSave: () => void;
}

export function ProductDialog({ open, onOpenChange, product, categories, onSave }: ProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    stock_quantity: '0',
    min_stock_level: '10',
    purchase_price: '0',
    sale_price: '0',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        category_id: product.category_id || '',
        stock_quantity: product.stock_quantity.toString(),
        min_stock_level: product.min_stock_level.toString(),
        purchase_price: product.purchase_price.toString(),
        sale_price: product.sale_price.toString(),
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category_id: '',
        stock_quantity: '0',
        min_stock_level: '10',
        purchase_price: '0',
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

      const productData = {
        user_id: getCurrentUserId(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        category_id: formData.category_id || null,
        stock_quantity: stockQty,
        min_stock_level: minStock,
        purchase_price: purchasePrice,
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Alış Fiyatı (₺) *</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
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
