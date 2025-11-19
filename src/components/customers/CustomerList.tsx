import { Customer } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Edit, Phone, Mail, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onViewDetail: (customer: Customer) => void;
}

export function CustomerList({ customers, onEdit, onViewDetail }: CustomerListProps) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>Müşteri Adı</th>
            <th>İletişim</th>
            <th>Açılış Bakiyesi</th>
            <th>Güncel Bakiye</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const hasDebt = customer.current_balance > 0;
            
            return (
              <tr key={customer.id}>
                <td>
                  <div className="font-medium">{customer.name}</div>
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
                <td>{formatCurrency(customer.opening_balance)}</td>
                <td>
                  <span className={hasDebt ? 'text-destructive font-semibold' : 'text-success'}>
                    {formatCurrency(customer.current_balance)}
                  </span>
                </td>
                <td>
                  {hasDebt ? (
                    <span className="badge badge-danger">Borçlu</span>
                  ) : (
                    <span className="badge badge-success">Temiz</span>
                  )}
                </td>
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
