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
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, Package, Undo2 } from 'lucide-react';

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SaleDetails {
  id: string;
  sale_no: string;
  customer_id: string | null;
  customer_name?: string;
  total_amount: number;
  currency: string;
  fx_rate: number;
  items: SaleItem[];
}

interface SaleReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturned: () => void;
}

export function SaleReturnDialog({ open, onOpenChange, onReturned }: SaleReturnDialogProps) {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saleNo, setSaleNo] = useState('');
  const [sale, setSale] = useState<SaleDetails | null>(null);
  const [returnItems, setReturnItems] = useState<Array<{ product_id: string; qty: number }>>([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');

  const handleSearch = async () => {
    if (!saleNo.trim()) {
      toast.error('Lütfen fiş numarası girin');
      return;
    }

    setSearchLoading(true);
    try {
      // Get sale details
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name)
        `)
        .eq('sale_no', saleNo.trim())
        .eq('is_reserved', false)
        .single();

      if (saleError || !saleData) {
        toast.error('Satış fişi bulunamadı: ' + saleNo);
        setSale(null);
        return;
      }

      // Get sale items
      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          products (name)
        `)
        .eq('sale_id', saleData.id);

      if (itemsError) throw itemsError;

      const items: SaleItem[] = (itemsData || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || 'Bilinmeyen Ürün',
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      setSale({
        id: saleData.id,
        sale_no: saleData.sale_no,
        customer_id: saleData.customer_id,
        customer_name: saleData.customers?.name,
        total_amount: saleData.total_amount,
        currency: saleData.currency,
        fx_rate: saleData.fx_rate || 1.0,
        items,
      });

      // Initialize return quantities
      setReturnItems(items.map(item => ({ product_id: item.product_id, qty: 0 })));

      toast.success('Satış fişi bulundu!');
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      console.error(error);
      setSale(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const updateReturnQty = (productId: string, qty: number) => {
    setReturnItems(prev => 
      prev.map(item => 
        item.product_id === productId 
          ? { ...item, qty: Math.max(0, Math.min(qty, sale?.items.find(i => i.product_id === productId)?.quantity || 0)) }
          : item
      )
    );
  };

  const totalReturnAmount = sale?.items.reduce((sum, item) => {
    const returnQty = returnItems.find(r => r.product_id === item.product_id)?.qty || 0;
    return sum + (returnQty * item.unit_price);
  }, 0) || 0;

  const handleReturn = async () => {
    if (!sale) return;

    const itemsToReturn = returnItems.filter(item => item.qty > 0);
    if (itemsToReturn.length === 0) {
      toast.error('En az bir ürün için iade miktarı girin');
      return;
    }

    if (!returnReason.trim()) {
      toast.error('Lütfen iade nedeni seçin');
      return;
    }

    setLoading(true);

    try {
      const userId = getCurrentUserId();
      const now = new Date().toISOString();

      // 1. Create sales_returns records
      for (const returnItem of itemsToReturn) {
        const saleItem = sale.items.find(i => i.product_id === returnItem.product_id);
        if (!saleItem) continue;

        const refundAmount = returnItem.qty * saleItem.unit_price;

        const { error: returnError } = await supabase
          .from('sales_returns')
          .insert({
            sale_id: sale.id,
            product_id: returnItem.product_id,
            qty: returnItem.qty,
            refund_amount: refundAmount,
            created_by: userId,
          });

        if (returnError) throw returnError;

        // 2. Update stock (add back)
        const { data: currentProduct, error: productError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', returnItem.product_id)
          .single();

        if (productError) throw productError;

        const newStock = currentProduct.stock_quantity + returnItem.qty;

        const { error: updateError } = await supabase
          .from('products')
          .update({
            stock_quantity: newStock,
            updated_at: now,
          })
          .eq('id', returnItem.product_id);

        if (updateError) throw updateError;

        // 3. Create stock movement record
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            product_id: returnItem.product_id,
            change_qty: returnItem.qty, // Positive for return
            type: 'return',
            ref_type: 'sale_return',
            ref_id: sale.id,
            unit_cost: saleItem.unit_price,
            fx_rate: sale.fx_rate,
            user_id: userId,
            notes: `İade: ${returnReason} - ${returnNotes || 'Açıklama yok'}`,
          });

        if (movementError) throw movementError;
      }

      // 4. If customer, update balance (reduce debt)
      if (sale.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('current_balance')
          .eq('id', sale.customer_id)
          .single();

        if (customerError) throw customerError;

        const oldBalance = customerData.current_balance;
        const returnAmountInTL = totalReturnAmount * sale.fx_rate;
        const newBalance = oldBalance - returnAmountInTL; // Return reduces debt

        // Create customer transaction
        const { error: txError } = await supabase
          .from('customer_transactions')
          .insert({
            user_id: userId,
            customer_id: sale.customer_id,
            type: 'refund',
            ref_id: sale.id,
            date: now,
            amount: returnAmountInTL,
            currency: sale.currency,
            fx_rate_to_tl: sale.fx_rate,
            balance_after: newBalance,
            notes: `İade: ${sale.sale_no} - ${returnReason}`,
            created_by: userId,
          });

        if (txError) throw txError;

        // Update customer balance
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            current_balance: newBalance,
            updated_at: now,
          })
          .eq('id', sale.customer_id);

        if (updateError) throw updateError;
      }

      toast.success(
        `✅ İade tamamlandı!\\n` +
        `İade Tutarı: ${formatCurrency(totalReturnAmount)} ${sale.currency}\\n` +
        `${sale.customer_id ? `Müşteri bakiyesi güncellendi: -${formatCurrency(totalReturnAmount * sale.fx_rate)} TL` : ''}`
      );

      onReturned();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error('İade işlemi başarısız: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSaleNo('');
    setSale(null);
    setReturnItems([]);
    setReturnReason('');
    setReturnNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="w-5 h-5" />
            Satış İade İşlemi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Sale */}
          <div className="space-y-2">
            <Label>Fiş Numarası</Label>
            <div className="flex gap-2">
              <Input
                placeholder="FIS-2024-00001"
                value={saleNo}
                onChange={(e) => setSaleNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={searchLoading || loading}
              />
              <Button onClick={handleSearch} disabled={searchLoading || loading}>
                {searchLoading ? 'Aranıyor...' : 'Ara'}
              </Button>
            </div>
          </div>

          {sale && (
            <>
              {/* Sale Info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fiş No: </span>
                    <span className="font-semibold">{sale.sale_no}</span>
                  </div>
                  {sale.customer_name && (
                    <div>
                      <span className="text-muted-foreground">Müşteri: </span>
                      <span className="font-semibold">{sale.customer_name}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Toplam Tutar: </span>
                    <span className="font-semibold">{formatCurrency(sale.total_amount)} {sale.currency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ürün Sayısı: </span>
                    <span className="font-semibold">{sale.items.length} Kalem</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold">Ürün</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold">Satılan</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold">İade Miktarı</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold">Birim Fiyat</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold">İade Tutarı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, index) => {
                      const returnQty = returnItems.find(r => r.product_id === item.product_id)?.qty || 0;
                      return (
                        <tr key={item.id} className="border-t border-border">
                          <td className="px-4 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              {item.product_name}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={returnQty}
                              onChange={(e) => updateReturnQty(item.product_id, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                              disabled={loading}
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-2 text-sm text-right font-semibold text-orange-600">
                            {formatCurrency(returnQty * item.unit_price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-secondary/50 border-t-2 border-primary">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold">Toplam İade Tutarı:</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(totalReturnAmount)} {sale.currency}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Return Details */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>İade Nedeni *</Label>
                  <Select value={returnReason} onValueChange={setReturnReason} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="İade nedeni seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hatalı Ürün">Hatalı Ürün</SelectItem>
                      <SelectItem value="Müşteri Memnuniyetsizliği">Müşteri Memnuniyetsizliği</SelectItem>
                      <SelectItem value="Yanlış Ürün">Yanlış Ürün</SelectItem>
                      <SelectItem value="Hasarlı Teslimat">Hasarlı Teslimat</SelectItem>
                      <SelectItem value="Fikir Değişikliği">Fikir Değişikliği</SelectItem>
                      <SelectItem value="Diğer">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Açıklama (Opsiyonel)</Label>
                  <Textarea
                    placeholder="İade hakkında detaylı açıklama..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    rows={3}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-700">
                  <p className="font-semibold mb-1">İade İşlemi Hakkında:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>İade edilen ürünler otomatik olarak stoka geri eklenecek</li>
                    <li>Müşteri bakiyesi düşürülecek (borç azalacak)</li>
                    <li>Stok hareket kaydı oluşturulacak</li>
                    <li>İşlem geri alınamaz!</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            {sale && (
              <Button onClick={handleReturn} disabled={loading || totalReturnAmount === 0} variant="destructive">
                {loading ? 'İşleniyor...' : 'İade İşlemini Tamamla'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
