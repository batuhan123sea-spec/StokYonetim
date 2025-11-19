import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerList } from '@/components/customers/CustomerList';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { AlphabetFilter } from '@/components/customers/AlphabetFilter';
import { CustomerDetailPanel } from '@/components/customers/CustomerDetailPanel';

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error('Müşteriler yüklenirken hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = selectedLetter
    ? customers.filter((c) => c.name.toUpperCase().startsWith(selectedLetter))
    : customers;

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    loadCustomers();
    setDialogOpen(false);
    setSelectedCustomer(null);
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
          <h1 className="text-3xl font-bold">Müşteriler</h1>
          <p className="text-muted-foreground mt-1">Müşterilerinizi ve hesap bakiyelerini yönetin</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Müşteri
        </Button>
      </div>

      <AlphabetFilter
        selectedLetter={selectedLetter}
        onSelectLetter={setSelectedLetter}
      />

      {filteredCustomers.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Müşteri bulunamadı</h3>
          <p className="text-muted-foreground text-sm">
            {selectedLetter
              ? `${selectedLetter} harfi ile başlayan müşteri bulunamadı.`
              : 'Henüz müşteri eklenmemiş. Başlamak için yeni müşteri ekleyin.'}
          </p>
        </div>
      ) : (
        <CustomerList 
          customers={filteredCustomers} 
          onEdit={handleEdit}
          onViewDetail={(customer) => setDetailCustomer(customer)} 
        />
      )}

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
        onSave={handleSaved}
      />

      {detailCustomer && (
        <CustomerDetailPanel customer={detailCustomer} onClose={() => setDetailCustomer(null)} />
      )}
    </div>
  );
}
