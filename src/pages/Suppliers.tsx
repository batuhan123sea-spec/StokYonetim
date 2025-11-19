import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Supplier } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, Search, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { SupplierList } from '@/components/suppliers/SupplierList';
import { SupplierDialog } from '@/components/suppliers/SupplierDialog';
import { SupplierDetailPanel } from '@/components/suppliers/SupplierDetailPanel';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      toast.error('Tedarikçiler yüklenirken hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    loadSuppliers();
    setDialogOpen(false);
    setSelectedSupplier(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tedarikçiler</h1>
          <p className="text-muted-foreground mt-1">Tedarikçilerinizi ve ürün fiyatlarını yönetin</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Tedarikçi
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Tedarikçi adı veya kişi ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tedarikçi bulunamadı</h3>
          <p className="text-muted-foreground text-sm">
            {searchQuery
              ? 'Arama kriterlerinize uygun tedarikçi bulunamadı.'
              : 'Henüz tedarikçi eklenmemiş. Başlamak için yeni tedarikçi ekleyin.'}
          </p>
        </div>
      ) : (
        <SupplierList 
          suppliers={filteredSuppliers} 
          onEdit={handleEdit}
          onViewDetail={(supplier) => setDetailSupplier(supplier)}
        />
      )}

      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
        onSave={handleSaved}
      />

      {detailSupplier && (
        <SupplierDetailPanel 
          supplier={detailSupplier} 
          onClose={() => setDetailSupplier(null)} 
        />
      )}
    </div>
  );
}
