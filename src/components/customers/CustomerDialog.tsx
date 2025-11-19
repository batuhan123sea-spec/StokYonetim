import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCurrentUserId } from '@/lib/constants';
import { Customer, RiskLevel } from '@/types';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSave: () => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onSave }: CustomerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vergi_no: '',
    opening_balance: '0',
    credit_limit: '',
    risk_durumu: 'Düşük' as RiskLevel,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        vergi_no: customer.vergi_no || '',
        opening_balance: customer.opening_balance.toString(),
        credit_limit: customer.credit_limit?.toString() || '',
        risk_durumu: customer.risk_durumu,
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        vergi_no: '',
        opening_balance: '0',
        credit_limit: '',
        risk_durumu: 'Düşük',
      });
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const openingBalance = parseFloat(formData.opening_balance);
      const creditLimit = formData.credit_limit ? parseFloat(formData.credit_limit) : null;
      const customerData = {
        user_id: getCurrentUserId(),
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        vergi_no: formData.vergi_no || null,
        opening_balance: openingBalance,
        current_balance: customer ? customer.current_balance : openingBalance,
        credit_limit: creditLimit,
        risk_durumu: formData.risk_durumu,
      };

      if (customer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id);
        if (error) throw error;
        toast.success('Müşteri güncellendi');
      } else {
        const { error } = await supabase.from('customers').insert(customerData);
        if (error) throw error;
        toast.success('Müşteri eklendi');
      }

      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Müşteri Adı *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vergi_no">Vergi Numarası</Label>
            <Input
              id="vergi_no"
              value={formData.vergi_no}
              onChange={(e) => setFormData({ ...formData, vergi_no: e.target.value })}
              placeholder="Kurumsal müşteriler için"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="credit_limit">Kredi Limiti (₺)</Label>
              <Input
                id="credit_limit"
                type="number"
                step="0.01"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                placeholder="0"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk_durumu">Risk Durumu</Label>
              <Select
                value={formData.risk_durumu}
                onValueChange={(value: RiskLevel) => setFormData({ ...formData, risk_durumu: value })}
                disabled={loading}
              >
                <SelectTrigger id="risk_durumu">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Düşük">🟢 Düşük Risk</SelectItem>
                  <SelectItem value="Orta">🟡 Orta Risk</SelectItem>
                  <SelectItem value="Yüksek">🔴 Yüksek Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening_balance">Açılış Bakiyesi (₺)</Label>
            <Input
              id="opening_balance"
              type="number"
              step="0.01"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              disabled={loading || !!customer}
            />
            {customer && (
              <p className="text-xs text-muted-foreground">
                Not: Açılış bakiyesi mevcut müşterilerde değiştirilemez
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
