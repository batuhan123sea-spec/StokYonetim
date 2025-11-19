import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';

export function ProfitLossReport() {
  return (
    <Card className="p-8 text-center">
      <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
      <h3 className="text-xl font-semibold mb-2">Kâr/Zarar Raporu</h3>
      <p className="text-muted-foreground mb-6">
        Gelir-gider tablosu, brüt/net kâr analizi ve dönemsel karşılaştırmalar
      </p>
      <Button variant="outline">Yakında</Button>
    </Card>
  );
}
