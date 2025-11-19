import { Customer, RiskLevel } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Edit, Phone, Mail, Eye, AlertTriangle, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onViewDetail: (customer: Customer) => void;
}

export function CustomerList({ customers, onEdit, onViewDetail }: CustomerListProps) {
  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'Düşük':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">🟢 Düşük Risk</Badge>;
      case 'Orta':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">🟡 Orta Risk</Badge>;
      case 'Yüksek':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">🔴 Yüksek Risk</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Müşteri Adı</th>
            <th>İletişim</th>
            <th>Güncel Bakiye</th>
            <th>Kredi Limiti</th>
            <th>Risk Durumu</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const hasDebt = customer.current_balance > 0;
            
            const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'Düşük':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">🟢 Düşük Risk</Badge>;
      case 'Orta':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">🟡 Orta Risk</Badge>;
      case 'Yüksek':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">🔴 Yüksek Risk</Badge>;
      default:
        return null;
    }
  };

  return (
              <tr key={customer.id}>
                <td>
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    {customer.vergi_no && (
                      <div className="text-xs text-muted-foreground mt-0.5">Vergi No: {customer.vergi_no}</div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="space-y-1">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="space-y-1">
                    <span className={hasDebt ? 'text-red-600 font-bold text-lg' : 'text-green-600 font-semibold'}>
                      {formatCurrency(customer.current_balance)}
                    </span>
                    {customer.credit_limit && customer.current_balance > customer.credit_limit * 0.8 && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Limite yaklaşıyor</span>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  {customer.credit_limit ? (
                    <span className="text-muted-foreground">{formatCurrency(customer.credit_limit)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td>{getRiskBadge(customer.risk_durumu)}</td>
                <td>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onViewDetail(customer)} title="Detay Görüntüle">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onEdit(customer)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
