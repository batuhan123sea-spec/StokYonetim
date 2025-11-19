import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

export function StockReports() {
  return (
    <Card className="p-8 text-center">
      <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
      <h3 className="text-xl font-semibold mb-2">Stok Raporları</h3>
      <p className="text-muted-foreground mb-6">
        Stok hareketleri, devir hızı, düşük stok uyarıları ve envanter değerleme raporları
      </p>
      <Button variant="outline">Yakında</Button>
    </Card>
  );
}
