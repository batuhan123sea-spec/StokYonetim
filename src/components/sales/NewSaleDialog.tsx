import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCurrentUserId } from '@/lib/constants';
import { Product, Customer, Currency, PaymentType } from '@/types';
import { Plus, Trash2, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils';
import { useExchangeRates } from '@/hooks/useExchangeRates';

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface NewSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function NewSaleDialog({ open, onOpenChange, onSaved }: NewSaleDialogProps) {
  const [loading, setLoading] = useState(false);
  const { rates, loading: ratesLoading } = useExchangeRates();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [customerId, setCustomerId] = useState('');
  const [taxIncluded, setTaxIncluded] = useState(true);
  const [taxRate, setTaxRate] = useState('20');
  const [paymentType, setPaymentType] = useState<PaymentType>('NAKIT');
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [isReserved, setIsReserved] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
      // Check if there's a scanned product from main page
      const scannedProductId = sessionStorage.getItem('scannedProductId');
      if (scannedProductId) {
        setSelectedProduct(scannedProductId);
        sessionStorage.removeItem('scannedProductId');
        // Auto-add after products load
        setTimeout(() => {
          if (products.length > 0) {
            addItem();
          }
        }, 500);
      }
    }
  }, [open]);

  // Auto-add product when scanned product is selected
  useEffect(() => {
    const scannedProductId = sessionStorage.getItem('scannedProductId');
    if (scannedProductId && selectedProduct === scannedProductId && products.length > 0) {
      addItem();
      sessionStorage.removeItem('scannedProductId');
    }
  }, [selectedProduct, products]);

  const loadData = async () => {
    const [productsRes, customersRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
    ]);

    setProducts(productsRes.data || []);
    setCustomers(customersRes.data || []);
  };

  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) return;

    const product = products.find(p => p.barcode === barcodeInput.trim());
    if (product) {
      setSelectedProduct(product.id);
      setBarcodeInput('');
      // Auto-add
      setTimeout(() => addItem(), 100);
    } else {
      toast.error('Barkod bulunamadı: ' + barcodeInput);
      setBarcodeInput('');
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearch();
    }
  };

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error('Miktar 0\'dan büyük olmalıdır');
      return;
    }

    if (!isReserved && qty > product.stock_quantity) {
      toast.error('Yetersiz stok');
      return;
    }

    const subtotal = product.sale_price * qty;
    setItems([
      ...items,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.sale_price,
        subtotal,
      },
    ]);

    // Set currency to product's purchase currency if different from TRY
    if (product.purchase_currency !== 'TRY' && currency === 'TRY') {
      setCurrency(product.purchase_currency);
      toast.info(`Para birimi ${product.purchase_currency} olarak değiştirildi`);
    }

    setSelectedProduct('');
    setQuantity('1');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals with tax
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const taxRateDecimal = parseFloat(taxRate) / 100;
  
  let taxAmount = 0;
  let totalAmount = subtotal;
  
  if (taxIncluded) {
    // Tax is already included in the price, extract it
    // If KDV %20: subtotal = total / 1.20, tax = total - subtotal
    const actualSubtotal = subtotal / (1 + taxRateDecimal);
    taxAmount = subtotal - actualSubtotal;
    totalAmount = subtotal; // Total stays the same
  } else {
    // Tax is NOT included, add it
    taxAmount = subtotal * taxRateDecimal;
    totalAmount = subtotal + taxAmount;
  }
  
  // Calculate exchange rate and TL equivalent
  let fxRate = 1.0;
  if (currency === 'USD') {
    fxRate = rates.USD;
  } else if (currency === 'EUR') {
    fxRate = rates.EUR;
  }
  const totalAmountInTL = totalAmount * fxRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('En az bir ürün ekleyin');
      return;
    }

    // CREDIT LIMIT CHECK: Warn if customer credit limit will be exceeded
    if (customerId && !isReserved) {
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('current_balance, credit_limit, name')
          .eq('id', customerId)
          .single();

        if (!customerError && customerData) {
          const currentBalance = customerData.current_balance;
          const creditLimit = customerData.credit_limit || 0;
          const newBalance = currentBalance + totalAmountInTL;

          if (creditLimit > 0 && newBalance > creditLimit) {
            const overage = newBalance - creditLimit;
            const proceed = window.confirm(
              `⚠️ KREDİ LİMİTİ UYARISI\n\n` +
              `Müşteri: ${customerData.name}\n` +
              `Mevcut Bakiye: ${formatCurrency(currentBalance)} TL\n` +
              `Kredi Limiti: ${formatCurrency(creditLimit)} TL\n` +
              `Satış Sonrası Bakiye: ${formatCurrency(newBalance)} TL\n` +
              `Limit Aşımı: ${formatCurrency(overage)} TL\n\n` +
              `Bu satışla müşteri kredi limitini ${formatCurrency(overage)} TL aşacak!\n\n` +
              `Satışa devam etmek istiyor musunuz?`
            );

            if (!proceed) {
              toast.info('Satış iptal edildi');
              return;
            }

            toast.warning(`Kredi limiti aşıldı: ${formatCurrency(overage)} TL`, {
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error('Credit limit check error:', error);
        // Continue with sale even if check fails
      }
    }

    setLoading(true);

    try {
      const userId = getCurrentUserId();
      const now = new Date().toISOString();
      
      // Tax and totals are already calculated above
      const finalSubtotal = taxIncluded ? subtotal / (1 + taxRateDecimal) : subtotal;
      const finalTax = taxAmount;
      const finalTotal = totalAmount;
      
      // Create sale with exchange rate
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: userId,
          customer_id: customerId || null,
          subtotal: finalSubtotal,
          tax: finalTax,
          total_amount: finalTotal,
          tax_included: taxIncluded,
          tax_rate: parseFloat(taxRate),
          payment_type: paymentType,
          currency,
          fx_rate: fxRate,
          is_reserved: isReserved,
          created_by: userId,
          odeme_durumu: isReserved ? 'BEKLIYOR' : 'ODEME_YAPILDI',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const { error: itemsError } = await supabase.from('sale_items').insert(
        items.map((item) => ({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        }))
      );

      if (itemsError) throw itemsError;
      
      // Update stock if not reserved
      if (!isReserved) {
        for (const item of items) {
          // Decrease stock
          const { data: currentProduct, error: productError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();
            
          if (productError) throw productError;
          
          const newStock = currentProduct.stock_quantity - item.quantity;
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              stock_quantity: newStock,
              updated_at: now,
            })
            .eq('id', item.product_id);
            
          if (updateError) throw updateError;
          
          // Create stock movement record
          const { error: movementError } = await supabase
            .from('stock_movements')
            .insert({
              product_id: item.product_id,
              change_qty: -item.quantity, // Negative for sale
              type: 'sale',
              ref_type: 'sale',
              ref_id: sale.id,
              unit_cost: item.unit_price,
              fx_rate: fxRate,
              user_id: userId,
              notes: `Satış No: ${sale.sale_no || sale.id}`,
            });
            
          if (movementError) throw movementError;
        }
      }
      
      // If customer selected and not reserved, create customer transaction
      if (customerId && !isReserved) {
        // Get current customer balance
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('current_balance')
          .eq('id', customerId)
          .single();
          
        if (customerError) throw customerError;
        
        const oldBalance = customerData.current_balance;
        const newBalance = oldBalance + totalAmountInTL; // Sale increases balance (debt)
        
        // Create transaction record
        const { error: txError } = await supabase
          .from('customer_transactions')
          .insert({
            user_id: userId,
            customer_id: customerId,
            type: 'sale',
            ref_id: sale.id,
            date: now,
            amount: totalAmountInTL, // TL equivalent
            currency,
            fx_rate_to_tl: fxRate,
            balance_after: newBalance,
            notes: `Satış No: ${sale.sale_no || sale.id}`,
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
          .eq('id', customerId);
          
        if (updateError) throw updateError;
      }

      const message = isReserved 
        ? 'Rezerve fiş oluşturuldu' 
        : currency === 'TRY'
          ? `Satış tamamlandı: ${formatCurrency(finalTotal)} TL`
          : `Satış tamamlandı: ${finalTotal.toFixed(2)} ${currency} (${formatCurrency(totalAmountInTL)} TL @ ${fxRate.toFixed(2)})`;
      
      toast.success(message);
      setItems([]);
      onSaved();
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
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Yeni Satış
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Barcode Quick Add */}
          <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Barkod ile Hızlı Ekle
            </h3>
            <div className="flex gap-2">
              <Input
                placeholder="Barkod okutun veya girin..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className="font-mono"
                autoFocus
              />
              <Button type="button" onClick={handleBarcodeSearch} disabled={!barcodeInput.trim()}>
                Ara
              </Button>
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Manuel Ürün Ekle</h3>
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
                      <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-secondary/30">
                    <td colSpan={3} className="px-4 py-2 text-right text-sm">
                      Ara Toplam:
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="font-semibold">
                        {formatCurrency(subtotal)} {currency === 'TRY' ? '' : currency}
                      </div>
                    </td>
                    <td></td>
                  </tr>
                  <tr className="border-t border-border bg-secondary/30">
                    <td colSpan={3} className="px-4 py-2 text-right text-sm">
                      KDV ({taxRate}%) {taxIncluded ? '(Dahil)' : ''}:
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="font-semibold">
                        {formatCurrency(taxAmount)} {currency === 'TRY' ? '' : currency}
                      </div>
                    </td>
                    <td></td>
                  </tr>
                  <tr className="border-t-2 border-primary bg-secondary/50">
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                      Genel Toplam:
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-lg text-primary">
                        {formatCurrency(totalAmount)} {currency === 'TRY' ? '' : currency}
                      </div>
                      {currency !== 'TRY' && (
                        <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-1">
                          <TrendingUp className="w-3 h-3" />
                          ≈ {formatCurrency(totalAmountInTL)} TL @ {fxRate.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Sale Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Müşteri</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçin (opsiyonel)" />
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
              <Label htmlFor="payment_type">Ödeme Tipi</Label>
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
              <Label htmlFor="currency">Para Birimi</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">₺ TRY</SelectItem>
                  <SelectItem value="USD">$ USD ({rates.USD.toFixed(2)} TL)</SelectItem>
                  <SelectItem value="EUR">€ EUR ({rates.EUR.toFixed(2)} TL)</SelectItem>
                </SelectContent>
              </Select>
              {currency !== 'TRY' && totalAmount > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Toplam TL karşılığı: {formatCurrency(totalAmountInTL)} TL
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_rate">KDV Oranı (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="tax_included">KDV Dahil</Label>
              <Switch checked={taxIncluded} onCheckedChange={setTaxIncluded} id="tax_included" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_reserved">Rezerve Fiş</Label>
                <p className="text-xs text-muted-foreground">Stoktan düşmez, müşteri test edebilir</p>
              </div>
              <Switch checked={isReserved} onCheckedChange={setIsReserved} id="is_reserved" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading || items.length === 0}>
              {loading ? 'İşleniyor...' : isReserved ? 'Rezerve Fiş Oluştur' : 'Satışı Tamamla'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
