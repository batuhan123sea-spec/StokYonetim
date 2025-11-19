import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { Printer, Calendar, Download } from 'lucide-react';

interface ZReportData {
  date: string;
  salesCount: number;
  totalSales: number;
  paymentBreakdown: {
    NAKIT: number;
    KREDI_KARTI: number;
    FHT: number;
    HVL: number;
  };
  openingCash: number;
  closingCash: number;
  expectedCash: number;
  difference: number;
}

export function ZReport() {
  const [loading, setLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<ZReportData | null>(null);

  useEffect(() => {
    generateReport();
  }, [reportDate]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const startDate = new Date(reportDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(reportDate);
      endDate.setHours(23, 59, 59, 999);

      // Get sales for the day (exclude reserved/pending sales)
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .gte('sale_date', startDate.toISOString())
        .lte('sale_date', endDate.toISOString())
        .eq('is_reserved', false)
        .eq('odeme_durumu', 'ODEME_YAPILDI');

      if (error) throw error;

      // Calculate totals (convert all to TRY using recorded fx_rate)
      let totalSalesInTRY = 0;
      sales?.forEach(sale => {
        const amount = Number(sale.total_amount);
        const fxRate = Number(sale.fx_rate) || 1.0;
        totalSalesInTRY += amount * fxRate;
      });

      const salesCount = sales?.length || 0;

      // Payment breakdown (in TRY)
      const paymentBreakdown = {
        NAKIT: 0,
        KREDI_KARTI: 0,
        FHT: 0,
        HVL: 0,
      };

      sales?.forEach(sale => {
        const amount = Number(sale.total_amount);
        const fxRate = Number(sale.fx_rate) || 1.0;
        const amountInTRY = amount * fxRate;
        
        if (sale.payment_type in paymentBreakdown) {
          paymentBreakdown[sale.payment_type as keyof typeof paymentBreakdown] += amountInTRY;
        }
      });

      // For demo, assume opening cash is 0 (should be stored in system)
      const openingCash = 0;
      const expectedCash = openingCash + paymentBreakdown.NAKIT;
      const closingCash = expectedCash; // In real system, user enters this
      const difference = closingCash - expectedCash;

      setReportData({
        date: reportDate,
        salesCount,
        totalSales: totalSalesInTRY,
        paymentBreakdown,
        openingCash,
        closingCash,
        expectedCash,
        difference,
      });
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

  const handleExport = () => {
    if (!reportData) return;
    
    const csv = `Z RAPORU\nTarih,${reportData.date}\n\nSatış Sayısı,${reportData.salesCount}\nToplam Satış,${reportData.totalSales}\n\nÖDEME DAĞILIMI\nNakit,${reportData.paymentBreakdown.NAKIT}\nKredi Kartı,${reportData.paymentBreakdown.KREDI_KARTI}\nFHT,${reportData.paymentBreakdown.FHT}\nHVL,${reportData.paymentBreakdown.HVL}\n\nKASA\nAçılış,${reportData.openingCash}\nBeklenen,${reportData.expectedCash}\nKapanış,${reportData.closingCash}\nFark,${reportData.difference}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `z-raporu-${reportData.date}.csv`;
    a.click();
    toast.success('Rapor indirildi');
  };

  if (loading || !reportData) {
    return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div className="space-y-1">
              <Label htmlFor="report-date">Rapor Tarihi</Label>
              <Input
                id="report-date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-48"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              CSV İndir
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Yazdır
            </Button>
          </div>
        </div>
      </Card>

      {/* Print Area */}
      <div className="print:block space-y-6">
        <Card className="p-8">
          <div className="text-center mb-8 border-b pb-6">
            <h2 className="text-2xl font-bold">Z RAPORU</h2>
            <p className="text-muted-foreground mt-2">Günlük Satış Raporu</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tarih: {new Date(reportData.date).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Sales Summary */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="section-card">
              <p className="text-sm text-muted-foreground mb-1">Satış Sayısı</p>
              <p className="text-3xl font-bold">{reportData.salesCount}</p>
            </div>
            <div className="section-card">
              <p className="text-sm text-muted-foreground mb-1">Toplam Satış</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(reportData.totalSales)}</p>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="section-card mb-8">
            <h3 className="font-semibold text-lg mb-4">Ödeme Dağılımı</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Nakit</span>
                <span className="font-semibold">{formatCurrency(reportData.paymentBreakdown.NAKIT)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Kredi Kartı</span>
                <span className="font-semibold">{formatCurrency(reportData.paymentBreakdown.KREDI_KARTI)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">FHT (Fatura Hesabına Tahsilat)</span>
                <span className="font-semibold">{formatCurrency(reportData.paymentBreakdown.FHT)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">HVL (Havale)</span>
                <span className="font-semibold">{formatCurrency(reportData.paymentBreakdown.HVL)}</span>
              </div>
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div className="section-card">
            <h3 className="font-semibold text-lg mb-4">Kasa Mutabakatı</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Açılış Kasası</span>
                <span className="font-semibold">{formatCurrency(reportData.openingCash)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Nakit Satışlar</span>
                <span className="font-semibold">{formatCurrency(reportData.paymentBreakdown.NAKIT)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t-2 border-primary/20">
                <span className="font-semibold">Beklenen Kasa</span>
                <span className="font-bold text-lg">{formatCurrency(reportData.expectedCash)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Sayılan Kasa</span>
                <span className="font-semibold">{formatCurrency(reportData.closingCash)}</span>
              </div>
              <div className={`flex justify-between items-center py-2 border-t-2 ${reportData.difference === 0 ? 'border-success/20' : 'border-warning/20'}`}>
                <span className="font-semibold">Fark</span>
                <span className={`font-bold text-lg ${reportData.difference === 0 ? 'text-success' : reportData.difference > 0 ? 'text-success' : 'text-destructive'}`}>
                  {reportData.difference >= 0 ? '+' : ''}{formatCurrency(reportData.difference)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t text-sm text-muted-foreground">
            <p>Rapor Tarihi: {new Date().toLocaleString('tr-TR')}</p>
            <p className="mt-1">Bu rapor sistem tarafından otomatik oluşturulmuştur.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
