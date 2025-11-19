import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

export function CustomerReports() {
  return (
    <Card className="p-8 text-center">
      <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
      <h3 className="text-xl font-semibold mb-2">Müşteri Raporları</h3>
      <p className="text-muted-foreground mb-6">
        Müşteri ekstreleri, yaşlandırma raporları ve müşteri bazlı satış analizleri
      </p>
      <Button variant="outline">Yakında</Button>
    </Card>
  );
}
