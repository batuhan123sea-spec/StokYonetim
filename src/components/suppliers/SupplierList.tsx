import { Supplier } from '@/types';
import { Edit, Phone, Mail, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SupplierListProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onViewDetail: (supplier: Supplier) => void;
}

export function SupplierList({ suppliers, onEdit, onViewDetail }: SupplierListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {suppliers.map((supplier) => (
        <div key={supplier.id} className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">{supplier.name}</h3>
              {supplier.contact_person && (
                <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onViewDetail(supplier)} title="Detayları Görüntüle">
                <Eye className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onEdit(supplier)} title="Düzenle">
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {supplier.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{supplier.phone}</span>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{supplier.email}</span>
              </div>
            )}
            {supplier.address && (
              <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                {supplier.address}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
