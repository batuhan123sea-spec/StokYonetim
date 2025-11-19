import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, Users, Package, Printer } from 'lucide-react';
import { ZReport } from '@/components/reports/ZReport';
import { CustomerReports } from '@/components/reports/CustomerReports';
import { StockReports } from '@/components/reports/StockReports';
import { ProfitLossReport } from '@/components/reports/ProfitLossReport';

export function Reports() {
  const [activeTab, setActiveTab] = useState('z-report');

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="text-3xl font-bold">Raporlar</h1>
        <p className="text-muted-foreground mt-1">İşletmenizin kapsamlı raporlarını görüntüleyin ve yazdırın</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="z-report" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Z Raporu
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Müşteri Raporları
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Stok Raporları
          </TabsTrigger>
          <TabsTrigger value="profit-loss" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Kâr/Zarar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="z-report">
          <ZReport />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerReports />
        </TabsContent>

        <TabsContent value="stock">
          <StockReports />
        </TabsContent>

        <TabsContent value="profit-loss">
          <ProfitLossReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
