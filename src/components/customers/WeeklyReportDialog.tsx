import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Download, Calendar, Printer, TrendingUp, TrendingDown } from 'lucide-react';

interface WeeklyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WeeklyData {
  customer_name: string;
  opening_balance: number;
  total_sales: number;
  total_payments: number;
  closing_balance: number;
  transaction_count: number;
}

export function WeeklyReportDialog({ open, onOpenChange }: WeeklyReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [reportData, setReportData] = useState<WeeklyData[]>([]);

  useEffect(() => {
    if (open) {
      // Set default to current week (Monday to Sunday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      setWeekStart(monday.toISOString().split('T')[0]);
      setWeekEnd(sunday.toISOString().split('T')[0]);
    }
  }, [open]);

  useEffect(() => {
    if (weekStart && weekEnd) {
      generateReport();
    }
  }, [weekStart, weekEnd]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const startDate = new Date(weekStart);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(weekEnd);
      endDate.setHours(23, 59, 59, 999);

      // Get all customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name, current_balance')
        .order('name');

      if (customersError) throw customersError;

      const weeklyData: WeeklyData[] = [];

      for (const customer of customers || []) {
        // Get transactions for this week
        const { data: transactions, error: txError } = await supabase
          .from('customer_transactions')
          .select('*')
          .eq('customer_id', customer.id)
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString());

        if (txError) throw txError;

        const totalSales = transactions
          ?.filter(t => t.type === 'sale')
          .reduce((sum, t) => sum + t.amount, 0) || 0;

        const totalPayments = transactions
          ?.filter(t => t.type === 'payment')
          .reduce((sum, t) => sum + t.amount, 0) || 0;

        // Calculate opening balance (current balance minus week's net change)
        const netChange = totalSales - totalPayments;
        const openingBalance = customer.current_balance - netChange;

        if (transactions && transactions.length > 0) {
          weeklyData.push({
            customer_name: customer.name,
            opening_balance: openingBalance,
            total_sales: totalSales,
            total_payments: totalPayments,
            closing_balance: customer.current_balance,
            transaction_count: transactions.length,
          });
        }
      }

      setReportData(weeklyData);

      if (weeklyData.length === 0) {
        toast.info('Seçilen hafta için işlem bulunamadı');
      }
    } catch (error: any) {
      toast.error('Rapor oluşturulurken hata: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Müşteri Adı',
      'Açılış Bakiyesi',
      'Toplam Satış',
      'Toplam Tahsilat',
      'Kapanış Bakiyesi',
      'İşlem Sayısı',
    ];

    const rows = reportData.map((data) => [
      data.customer_name,
      data.opening_balance.toFixed(2),
      data.total_sales.toFixed(2),
      data.total_payments.toFixed(2),
      data.closing_balance.toFixed(2),
      data.transaction_count,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `haftalik_rapor_${weekStart}_${weekEnd}.csv`;
    link.click();

    toast.success('Rapor indirildi');
  };

  const totalSales = reportData.reduce((sum, d) => sum + d.total_sales, 0);
  const totalPayments = reportData.reduce((sum, d) => sum + d.total_payments, 0);
  const totalOpeningBalance = reportData.reduce((sum, d) => sum + d.opening_balance, 0);
  const totalClosingBalance = reportData.reduce((sum, d) => sum + d.closing_balance, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Haftalık Müşteri Özet Raporu
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Bitiş Tarihi</Label>
              <Input
                type="date"
                value={weekEnd}
                onChange={(e) => setWeekEnd(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex gap-2 pt-6">
              <Button variant="outline" onClick={handlePrint} disabled={loading || reportData.length === 0}>
                <Printer className="w-4 h-4 mr-2" />
                Yazdır
              </Button>
              <Button variant="outline" onClick={handleExportCSV} disabled={loading || reportData.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                CSV İndir
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-muted-foreground">Rapor oluşturuluyor...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Seçilen tarih aralığında işlem bulunamadı
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Açılış Bakiyesi</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalOpeningBalance)}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Toplam Satış
                  </p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSales)}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Toplam Tahsilat
                  </p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPayments)}</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Kapanış Bakiyesi</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalClosingBalance)}</p>
                </div>
              </div>

              {/* Report Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Müşteri</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">Açılış Bakiyesi</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">Satışlar</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">Tahsilatlar</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">Kapanış Bakiyesi</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold">İşlem Sayısı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((data, index) => (
                      <tr key={index} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-4 py-3 text-sm font-medium">{data.customer_name}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(data.opening_balance)}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">
                          +{formatCurrency(data.total_sales)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">
                          -{formatCurrency(data.total_payments)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold">
                          <span className={data.closing_balance > 0 ? 'text-red-600' : data.closing_balance < 0 ? 'text-green-600' : ''}>
                            {formatCurrency(data.closing_balance)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {data.transaction_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-secondary/50 border-t-2 border-primary">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold">TOPLAM</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(totalOpeningBalance)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                        +{formatCurrency(totalSales)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                        -{formatCurrency(totalPayments)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(totalClosingBalance)}</td>
                      <td className="px-4 py-3 text-sm text-center font-bold">
                        {reportData.reduce((sum, d) => sum + d.transaction_count, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer Info */}
              <div className="text-center text-xs text-muted-foreground pt-4 border-t">
                <p>Rapor Tarihi: {new Date().toLocaleString('tr-TR')}</p>
                <p>Dönem: {new Date(weekStart).toLocaleDateString('tr-TR')} - {new Date(weekEnd).toLocaleDateString('tr-TR')}</p>
                <p className="mt-1">Toplam {reportData.length} müşteri listelendi</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
