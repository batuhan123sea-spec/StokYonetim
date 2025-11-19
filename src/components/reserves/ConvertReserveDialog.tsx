import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCurrentUserId } from '@/lib/constants';
import { Reserve, ReserveItem, PaymentType, Currency } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ConvertReserveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserve: Reserve;
  onConverted: () => void;
}

export function ConvertReserveDialog({ open, onOpenChange, reserve, onConverted }: ConvertReserveDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<(ReserveItem & { qty_taken: number; qty_returned: number })[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>('NAKIT');
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [paymentAmount, setPaymentAmount] = useState('0');

  useEffect(() => {
    if (open && reserve) {
      loadReserveItems();
    }
  }, [open, reserve]);

  const loadReserveItems = async () => {
    const { data, error } = await supabase
      .from('reserve_items')
      .select('*, product:products(*)')
      .eq('reserve_id', reserve.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setItems(
      data.map((item: any) => ({
        ...item,
        qty_taken: item.qty_reserved,
        qty_returned: 0,
      }))
    );
  };

  const updateQtyTaken = (index: number, value: string) => {
    const qty = Math.max(0, Math.min(parseInt(value) || 0, items[index].qty_reserved));
    const newItems = [...items];
    newItems[index].qty_taken = qty;
    newItems[index].qty_returned = items[index].qty_reserved - qty;
    setItems(newItems);
  };

  const totalTaken = items.reduce((sum, item) => sum + item.qty_taken * item.unit_price, 0);
  const totalReturned = items.reduce((sum, item) => sum + item.qty_returned * item.unit_price, 0);

  const handleConvert = async () => {
    setLoading(true);

    try {
      // 1. Create sale for taken items
      const takenItems = items.filter((item) => item.qty_taken > 0);
      if (takenItems.length === 0) {
        toast.error('En az bir ürün alınmalı');
        return;
      }

      const taxRate = 20;
      const subtotal = totalTaken / (1 + taxRate / 100);
      const tax = totalTaken - subtotal;

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: getCurrentUserId(),
          customer_id: reserve.customer_id,
          subtotal,
          tax,
          total_amount: totalTaken,
          tax_rate: taxRate,
          payment_type: paymentType,
          currency,
          is_from_reserve: true,
          reserve_id: reserve.id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Create sale items and update stock
      const { error: itemsError } = await supabase.from('sale_items').insert(
        takenItems.map((item) => ({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.qty_taken,
          unit_price: item.unit_price,
          subtotal: item.qty_taken * item.unit_price,
        }))
      );

      if (itemsError) throw itemsError;

      // 3. Create stock movements for taken items (decrease stock)
      for (const item of takenItems) {
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          change_qty: -item.qty_taken,
          type: 'sale',
          ref_type: 'sale',
          ref_id: sale.id,
        });

        // Update product stock
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ stock_quantity: product.stock_quantity - item.qty_taken })
            .eq('id', item.product_id);
        }
      }

      // 4. Create stock movements for returned items (increase stock)
      const returnedItems = items.filter((item) => item.qty_returned > 0);
      for (const item of returnedItems) {
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          change_qty: item.qty_returned,
          type: 'return',
          ref_type: 'reserve',
          ref_id: reserve.id,
        });

        // Create return record
        await supabase.from('sales_returns').insert({
          sale_id: sale.id,
          product_id: item.product_id,
          qty: item.qty_returned,
          refund_amount: item.qty_returned * item.unit_price,
        });

        // Update product stock
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ stock_quantity: product.stock_quantity + item.qty_returned })
            .eq('id', item.product_id);
        }
      }

      // 5. Create customer transaction
      if (reserve.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('current_balance')
          .eq('id', reserve.customer_id)
          .single();

        if (customer) {
          const newBalance = customer.current_balance + totalTaken;

          await supabase.from('customer_transactions').insert({
            customer_id: reserve.customer_id,
            type: 'sale',
            ref_id: sale.id,
            amount: totalTaken,
            currency,
            fx_rate_to_tl: 1.0,
            balance_after: newBalance,
            notes: `Rezerve fiş ${reserve.reserve_no} satışa çevrildi`,
          });

          // Update customer balance
          await supabase
            .from('customers')
            .update({ current_balance: newBalance })
            .eq('id', reserve.customer_id);

          // If payment is provided
          const payment = parseFloat(paymentAmount);
          if (payment > 0) {
            await supabase.from('payments').insert({
              user_id: getCurrentUserId(),
              customer_id: reserve.customer_id,
              amount: payment,
              currency,
              payment_type: paymentType,
            });

            await supabase.from('customer_transactions').insert({
              customer_id: reserve.customer_id,
              type: 'payment',
              amount: payment,
              currency,
              fx_rate_to_tl: 1.0,
              balance_after: newBalance - payment,
              notes: `Rezerve fiş ${reserve.reserve_no} ödemesi`,
            });

            await supabase
              .from('customers')
              .update({ current_balance: newBalance - payment })
              .eq('id', reserve.customer_id);
          }
        }
      }

      // 6. Update reserve status
      await supabase
        .from('reserves')
        .update({
          is_converted: true,
          converted_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', reserve.id);

      toast.success('Rezerve fiş başarıyla satışa çevrildi');
      onConverted();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rezerve Fişi Satışa Çevir: {reserve.reserve_no}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Items Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Ürün</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">Rezerve</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold">Alınan</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">İade</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">Birim Fiyat</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-2 text-sm">{item.product?.name}</td>
                    <td className="px-4 py-2 text-sm text-right">{item.qty_reserved}</td>
                    <td className="px-4 py-2 text-center">
                      <Input
                        type="number"
                        value={item.qty_taken}
                        onChange={(e) => updateQtyTaken(index, e.target.value)}
                        min="0"
                        max={item.qty_reserved}
                        className="w-20 text-center"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-orange-500">{item.qty_returned}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-2 text-sm text-right font-semibold">
                      {formatCurrency(item.qty_taken * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Alınan Ürünler Toplamı</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalTaken)}
              </p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">İade Edilen Ürünler</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(totalReturned)}
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Ödeme Bilgileri</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ödeme Tipi</Label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NAKIT">Nakit</SelectItem>
                    <SelectItem value="KREDI_KARTI">Kredi Kartı</SelectItem>
                    <SelectItem value="FHT">FHT</SelectItem>
                    <SelectItem value="HVL">HVL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
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

              <div className="space-y-2">
                <Label>Ödeme Tutarı (Opsiyonel)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              ℹ️ Alınan ürünler stoktan düşecek ve satış kaydı oluşturulacak. İade edilen ürünler tekrar stoka
              eklenecek.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button onClick={handleConvert} disabled={loading}>
              {loading ? 'İşleniyor...' : 'Satışa Çevir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
