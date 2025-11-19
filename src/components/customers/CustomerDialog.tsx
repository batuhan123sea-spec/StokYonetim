import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCurrentUserId } from '@/lib/constants';
import { Customer } from '@/types';

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
    opening_balance: '0',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        opening_balance: customer.opening_balance.toString(),
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        opening_balance: '0',
      });
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const openingBalance = parseFloat(formData.opening_balance);
      const customerData = {
        user_id: getCurrentUserId(),
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        opening_balance: openingBalance,
        current_balance: customer ? customer.current_balance : openingBalance,
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
