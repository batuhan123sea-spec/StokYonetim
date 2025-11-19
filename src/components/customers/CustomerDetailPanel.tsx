import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Download, FileText, DollarSign, Plus, Printer, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Customer, CustomerTransaction, Currency } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { getCurrentUserId } from '@/lib/constants';

interface CustomerDetailPanelProps {
  customer: Customer;
  onClose: () => void;
}

interface TransactionWithDetails extends CustomerTransaction {
  sale_items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
  balance_before?: number;
}

export function CustomerDetailPanel({ customer, onClose }: CustomerDetailPanelProps) {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('TRY');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [customer.id]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      // Load transactions
      const { data: txData, error: txError } = await supabase
        .from('customer_transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('date', { ascending: false });

      if (txError) throw txError;

      // For each sale transaction, load sale items
      const transactionsWithDetails: TransactionWithDetails[] = [];
      
      for (const tx of txData || []) {
        const txWithDetails: TransactionWithDetails = { ...tx };
        
        // Calculate balance before this transaction
        const previousBalance = tx.balance_after - (tx.type === 'payment' ? -tx.amount : tx.amount);
        txWithDetails.balance_before = previousBalance;

        if (tx.type === 'sale' && tx.ref_id) {
          // Load sale items with product names
          const { data: saleItemsData, error: saleItemsError } = await supabase
            .from('sale_items')
            .select('quantity, unit_price, products(name)')
            .eq('sale_id', tx.ref_id);

          if (!saleItemsError && saleItemsData) {
            txWithDetails.sale_items = saleItemsData.map((item: any) => ({
              product_name: item.products?.name || 'Bilinmeyen Ürün',
              quantity: item.quantity,
              unit_price: item.unit_price,
            }));
          }
        }

        transactionsWithDetails.push(txWithDetails);
      }

      setTransactions(transactionsWithDetails);
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Geçerli bir tutar girin');
      return;
    }

    setPaymentLoading(true);
    console.log('💰 Tahsilat işlemi başlatılıyor...', {
      customer: customer.name,
      amount,
      currency: paymentCurrency,
      method: paymentMethod,
    });

    try {
      const userId = getCurrentUserId();
      const now = new Date().toISOString();
      
      console.log('👤 User ID:', userId);

      // Step 1: Insert payment
      console.log('📝 1/3: Payment kaydı oluşturuluyor...');
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          customer_id: customer.id,
          amount,
          currency: paymentCurrency,
          payment_type: paymentMethod,
          payment_date: now,
          notes: paymentNotes || null,
          created_by: userId,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('❌ Payment insert hatası:', paymentError);
        throw new Error(`Payment kaydı oluşturulamadı: ${paymentError.message} (${paymentError.code})`);
      }
      console.log('✅ Payment kaydı oluşturuldu:', payment.id);

      // Step 2: Calculate new balance
      const newBalance = customer.current_balance - amount;
      console.log('💵 Bakiye hesaplandı:', {
        önceki: customer.current_balance,
        tahsilat: amount,
        yeni: newBalance,
      });

      // Step 3: Create customer transaction record
      console.log('📝 2/3: Customer transaction kaydı oluşturuluyor...');
      const { error: txError } = await supabase
        .from('customer_transactions')
        .insert({
          customer_id: customer.id,
          type: 'payment',
          ref_id: payment.id,
          date: now,
          amount,
          currency: paymentCurrency,
          balance_after: newBalance,
          notes: paymentNotes || null,
          created_by: userId,
        });

      if (txError) {
        console.error('❌ Transaction insert hatası:', txError);
        // Rollback payment
        await supabase.from('payments').delete().eq('id', payment.id);
        throw new Error(`Transaction kaydı oluşturulamadı: ${txError.message} (${txError.code})`);
      }
      console.log('✅ Transaction kaydı oluşturuldu');

      // Step 4: Update customer balance
      console.log('📝 3/3: Müşteri bakiyesi güncelleniyor...');
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          current_balance: newBalance,
          updated_at: now,
        })
        .eq('id', customer.id);

      if (updateError) {
        console.error('❌ Customer update hatası:', updateError);
        throw new Error(`Müşteri bakiyesi güncellenemedi: ${updateError.message} (${updateError.code})`);
      }
      console.log('✅ Müşteri bakiyesi güncellendi');

      console.log('🎉 Tahsilat işlemi tamamlandı!');
      toast.success(`Tahsilat kaydedildi: ${formatCurrency(amount)} ${paymentCurrency}`);
      
      // Reset form
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentCurrency('TRY');
      setPaymentMethod('cash');
      
      // Reload data
      loadCustomerData();
      
      // Refresh parent component after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('💥 Tahsilat hatası:', error);
      toast.error('Tahsilat kaydedilemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'sale':
        return 'Satış';
      case 'payment':
        return 'Tahsilat';
      case 'refund':
        return 'İade';
      case 'reserve':
        return 'Rezerve';
      case 'opening':
        return 'Açılış Bakiyesi';
      default:
        return type;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'text-red-600';
      case 'payment':
        return 'text-green-600';
      case 'refund':
        return 'text-orange-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const exportCSV = () => {
    const headers = ['Tarih', 'Tip', 'Tutar', 'Para Birimi', 'Önceki Bakiye', 'Sonraki Bakiye', 'Açıklama'];
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleString('tr-TR'),
      getTransactionTypeLabel(t.type),
      t.amount.toFixed(2),
      t.currency,
      (t.balance_before || 0).toFixed(2),
      t.balance_after.toFixed(2),
      t.notes || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${customer.name}_hesap_ekstre_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Hesap ekstresi indirildi');
  };

  const printCollectionReceipt = () => {
    // Create print-friendly HTML
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up engellendi. Lütfen tarayıcı ayarlarını kontrol edin.');
      return;
    }

    const totalSales = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const totalPayments = transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Tahsilat Fişi - ${customer.name}</title>
        <style>
          @media print {
            @page { margin: 0.5cm; }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 {
            font-size: 16px;
            margin: 5px 0;
          }
          .header p {
            font-size: 10px;
            margin: 2px 0;
          }
          .section {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px dashed #ccc;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            font-size: 11px;
          }
          .label {
            font-weight: bold;
          }
          .transaction {
            margin: 5px 0;
            padding: 5px;
            background: #f5f5f5;
          }
          .transaction-header {
            font-weight: bold;
            margin-bottom: 3px;
          }
          .product-item {
            margin-left: 10px;
            font-size: 10px;
            color: #555;
          }
          .total {
            font-size: 14px;
            font-weight: bold;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #000;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px dashed #000;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>STOK YÖNETİM SİSTEMİ</h1>
          <p>Tahsilat Fişi / Hesap Ekstresi</p>
          <p>${new Date().toLocaleString('tr-TR')}</p>
        </div>

        <div class="section">
          <div class="row">
            <span class="label">Müşteri:</span>
            <span>${customer.name}</span>
          </div>
          ${customer.phone ? `
          <div class="row">
            <span class="label">Telefon:</span>
            <span>${customer.phone}</span>
          </div>
          ` : ''}
          ${customer.address ? `
          <div class="row">
            <span class="label">Adres:</span>
            <span>${customer.address}</span>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="row">
            <span class="label">Açılış Bakiyesi:</span>
            <span>${formatCurrency(customer.opening_balance)} ${customer.opening_currency}</span>
          </div>
          <div class="row">
            <span class="label">Güncel Bakiye:</span>
            <span style="color: ${customer.current_balance > 0 ? 'red' : 'green'}; font-weight: bold;">
              ${formatCurrency(customer.current_balance)}
            </span>
          </div>
        </div>

        <div class="section">
          <h3 style="margin: 5px 0; font-size: 13px;">Hesap Hareketleri</h3>
          ${transactions.map(tx => `
            <div class="transaction">
              <div class="transaction-header">
                ${new Date(tx.date).toLocaleDateString('tr-TR')} - ${getTransactionTypeLabel(tx.type)}
              </div>
              <div class="row">
                <span>Tutar:</span>
                <span>${tx.type === 'payment' ? '-' : '+'}${formatCurrency(tx.amount)} ${tx.currency}</span>
              </div>
              <div class="row">
                <span>Önceki Bakiye:</span>
                <span>${formatCurrency(tx.balance_before || 0)}</span>
              </div>
              <div class="row">
                <span>Sonraki Bakiye:</span>
                <span>${formatCurrency(tx.balance_after)}</span>
              </div>
              ${tx.sale_items && tx.sale_items.length > 0 ? `
                <div style="margin-top: 5px;">
                  <div style="font-size: 10px; font-weight: bold; margin-bottom: 2px;">Ürünler:</div>
                  ${tx.sale_items.map(item => `
                    <div class="product-item">
                      • ${item.product_name} x${item.quantity} = ${formatCurrency(item.quantity * item.unit_price)}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              ${tx.notes ? `<div style="font-size: 10px; color: #666; margin-top: 3px;">Not: ${tx.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="section">
          <div class="row total">
            <span>Toplam Satış:</span>
            <span style="color: red;">${formatCurrency(totalSales)}</span>
          </div>
          <div class="row total">
            <span>Toplam Tahsilat:</span>
            <span style="color: green;">${formatCurrency(totalPayments)}</span>
          </div>
          <div class="row total">
            <span>Kalan Bakiye:</span>
            <span style="color: ${customer.current_balance > 0 ? 'red' : 'green'};">
              ${formatCurrency(customer.current_balance)}
            </span>
          </div>
        </div>

        <div class="footer">
          <p>Bizi tercih ettiğiniz için teşekkür ederiz.</p>
          <p>Bu fiş bilgilendirme amaçlıdır.</p>
        </div>

        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-2/3 bg-card border-l border-border shadow-2xl overflow-y-auto z-50 scrollbar-thin">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between z-10 shadow-sm backdrop-blur-sm bg-opacity-95">
        <div>
          <h2 className="text-2xl font-bold">{customer.name}</h2>
          <p className="text-sm text-muted-foreground">Mali Takip & Hesap Hareketleri</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={printCollectionReceipt}>
            <Printer className="w-4 h-4 mr-2" />
            Fiş Yazdır
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV İndir
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Customer Summary Card */}
        <Card className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Açılış Bakiyesi</p>
              <p className="text-xl font-bold">
                {formatCurrency(customer.opening_balance)} <span className="text-sm font-normal">{customer.opening_currency}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Güncel Bakiye</p>
              <p className={`text-2xl font-bold ${customer.current_balance > 0 ? 'text-red-600' : customer.current_balance < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                {formatCurrency(customer.current_balance)}
              </p>
            </div>
            {customer.credit_limit && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Kredi Limiti</p>
                <p className="text-xl font-semibold text-orange-600">{formatCurrency(customer.credit_limit)}</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-primary/10 grid grid-cols-2 gap-4 text-xs">
            {customer.phone && (
              <div>
                <span className="text-muted-foreground">Telefon: </span>
                <span className="font-medium">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div>
                <span className="text-muted-foreground">E-posta: </span>
                <span className="font-medium">{customer.email}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Add Payment Section */}
        <Card className="p-5 bg-green-500/5 border-green-500/20">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-700">
            <DollarSign className="w-5 h-5" />
            Tahsilat Kaydet
          </h3>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4">
              <Label className="text-xs">Tutar *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={paymentLoading}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Para Birimi</Label>
              <Select value={paymentCurrency} onValueChange={(v) => setPaymentCurrency(v as Currency)} disabled={paymentLoading}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">₺ TRY</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Ödeme Yöntemi</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={paymentLoading}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Nakit</SelectItem>
                  <SelectItem value="card">Kredi Kartı</SelectItem>
                  <SelectItem value="bank_transfer">Havale/EFT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 flex items-end">
              <Button onClick={handleAddPayment} disabled={paymentLoading} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Tahsilat Kaydet
              </Button>
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs">Açıklama (Opsiyonel)</Label>
            <Input
              placeholder="Ödeme hakkında not..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              disabled={paymentLoading}
              className="mt-1"
            />
          </div>
        </Card>

        {/* Transaction History */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Hesap Hareketleri ({transactions.length} İşlem)
          </h3>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-muted-foreground text-sm">Yükleniyor...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Henüz işlem yapılmamış</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="p-4 bg-secondary/30 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  {/* Transaction Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`font-semibold ${getTransactionColor(tx.type)}`}>
                          {getTransactionTypeLabel(tx.type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString('tr-TR', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {tx.notes && (
                        <p className="text-xs text-muted-foreground italic">{tx.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${tx.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'payment' ? '-' : '+'}
                        {formatCurrency(tx.amount)} {tx.currency}
                      </p>
                    </div>
                  </div>

                  {/* Product Details for Sales */}
                  {tx.sale_items && tx.sale_items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">Satılan Ürünler:</span>
                      </div>
                      <div className="space-y-1">
                        {tx.sale_items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between items-center text-xs bg-background/50 px-3 py-1.5 rounded">
                            <span className="text-muted-foreground">
                              • {item.product_name} <span className="font-semibold">x{item.quantity}</span>
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(item.quantity * item.unit_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Balance Info */}
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground">Önceki Bakiye: </span>
                      <span className="font-semibold">{formatCurrency(tx.balance_before || 0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">→</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sonraki Bakiye: </span>
                      <span className={`font-bold ${tx.balance_after > 0 ? 'text-red-600' : tx.balance_after < 0 ? 'text-green-600' : ''}`}>
                        {formatCurrency(tx.balance_after)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
