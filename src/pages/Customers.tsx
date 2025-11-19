import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Customer, CustomerSummary, RiskLevel } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users as UsersIcon, Search } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerList } from '@/components/customers/CustomerList';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { AlphabetFilter } from '@/components/customers/AlphabetFilter';
import { CustomerDetailPanel } from '@/components/customers/CustomerDetailPanel';

export function Customers() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      // Use customer_summary view for comprehensive data including geciken_tutar and son_islem_tarihi
      const { data, error } = await supabase
        .from('customer_summary')
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

  // Apply all filters
  const filteredCustomers = customers.filter((customer) => {
    // Letter filter
    if (selectedLetter && !customer.name.toUpperCase().startsWith(selectedLetter)) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = customer.name.toLowerCase().includes(query);
      const matchesPhone = customer.phone?.toLowerCase().includes(query);
      const matchesVergi = customer.vergi_no?.toLowerCase().includes(query);
      
      if (!matchesName && !matchesPhone && !matchesVergi) {
        return false;
      }
    }

    // Risk filter
    if (riskFilter !== 'all' && customer.risk_durumu !== riskFilter) {
      return false;
    }

    return true;
  });

  const handleEdit = (customer: CustomerSummary) => {
    // Convert CustomerSummary to Customer for dialog (add missing fields)
    const customerForEdit: Customer = {
      ...customer,
      current_balance: customer.toplam_alacak,
      credit_limit: customer.kredi_limiti,
      opening_balance: 0, // Not available in summary, will be fetched if needed
      opening_currency: 'TRY',
      notes: '',
      created_at: '',
      updated_at: '',
      user_id: '',
    };
    setSelectedCustomer(customerForEdit);
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
          <h1 className="text-3xl font-bold">Müşteri Defteri</h1>
          <p className="text-muted-foreground mt-1">Müşterilerinizi ve hesap bakiyelerini yönetin</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Müşteri
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Müşteri adı, telefon veya vergi no ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskLevel | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Risk Durumu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Risk Durumları</SelectItem>
                <SelectItem value="Düşük">🟢 Düşük Risk</SelectItem>
                <SelectItem value="Orta">🟡 Orta Risk</SelectItem>
                <SelectItem value="Yüksek">🔴 Yüksek Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4 flex items-center justify-end">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold">{filteredCustomers.length}</span> müşteri gösteriliyor
            </span>
          </div>
        </div>
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
            {searchQuery || riskFilter !== 'all' || selectedLetter
              ? 'Arama kriterlerinize uygun müşteri bulunamadı.'
              : 'Henüz müşteri eklenmemiş. Başlamak için yeni müşteri ekleyin.'}
          </p>
          {(searchQuery || riskFilter !== 'all' || selectedLetter) && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setRiskFilter('all');
                setSelectedLetter(null);
              }}
            >
              Filtreleri Temizle
            </Button>
          )}
        </div>
      ) : (
        <CustomerList 
          customers={filteredCustomers} 
          onEdit={handleEdit}
          onViewDetail={(customer) => {
            // Convert CustomerSummary to Customer for detail panel
            const customerForDetail: Customer = {
              ...customer,
              current_balance: customer.toplam_alacak,
              credit_limit: customer.kredi_limiti,
              opening_balance: 0,
              opening_currency: 'TRY',
              notes: '',
              created_at: '',
              updated_at: '',
              user_id: '',
            };
            setDetailCustomer(customerForDetail);
          }} 
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
