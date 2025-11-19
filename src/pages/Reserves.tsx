import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Reserve, ReserveItem } from '@/types';
import { toast } from 'sonner';
import { ReserveDialog } from '@/components/reserves/ReserveDialog';
import { ConvertReserveDialog } from '@/components/reserves/ConvertReserveDialog';
import { formatCurrency } from '@/lib/utils';

export function Reserves() {
  const [reserves, setReserves] = useState<(Reserve & { items: ReserveItem[]; customer_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedReserve, setSelectedReserve] = useState<Reserve | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'completed' | 'expired'>('all');

  useEffect(() => {
    loadReserves();
  }, [filter]);

  const loadReserves = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reserves')
        .select(`
          *,
          reserve_items (
            *,
            product:products (*)
          ),
          customer:customers (name)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReserves(
        data?.map((r: any) => ({
          ...r,
          items: r.reserve_items,
          customer_name: r.customer?.name,
        })) || []
      );
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Açık';
      case 'completed':
        return 'Tamamlandı';
      case 'expired':
        return 'Süresi Doldu';
      case 'cancelled':
        return 'İptal';
      default:
        return status;
    }
  };

  const totalAmount = (items: ReserveItem[]) => {
    return items.reduce((sum, item) => sum + item.qty_reserved * item.unit_price, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rezerve Fişler</h1>
          <p className="text-sm text-muted-foreground mt-1">Stok düşmeden müşteri test sistemi</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Rezerve Fiş
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'open', 'completed', 'expired'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' && 'Tümü'}
            {f === 'open' && 'Açık'}
            {f === 'completed' && 'Tamamlandı'}
            {f === 'expired' && 'Süresi Doldu'}
          </Button>
        ))}
      </div>

      {/* Reserves Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
      ) : reserves.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Henüz rezerve fiş bulunmuyor</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reserves.map((reserve) => (
            <Card key={reserve.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(reserve.status)}
                    <span className="font-semibold text-sm">{reserve.reserve_no}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(reserve.date).toLocaleString('tr-TR')}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    reserve.status === 'open'
                      ? 'bg-blue-500/10 text-blue-500'
                      : reserve.status === 'completed'
                      ? 'bg-green-500/10 text-green-500'
                      : reserve.status === 'expired'
                      ? 'bg-orange-500/10 text-orange-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {getStatusLabel(reserve.status)}
                </span>
              </div>

              {reserve.customer_name && (
                <p className="text-sm font-medium mb-2">{reserve.customer_name}</p>
              )}

              <div className="space-y-1 mb-3">
                {reserve.items.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate">
                      {item.product?.name} x{item.qty_reserved}
                    </span>
                    <span className="font-medium">{formatCurrency(item.unit_price * item.qty_reserved)}</span>
                  </div>
                ))}
                {reserve.items.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{reserve.items.length - 3} ürün daha...</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="font-bold text-sm">Toplam: {formatCurrency(totalAmount(reserve.items))}</span>
                {reserve.status === 'open' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedReserve(reserve);
                      setConvertDialogOpen(true);
                    }}
                  >
                    Satışa Çevir
                  </Button>
                )}
              </div>

              {reserve.expires_at && reserve.status === 'open' && (
                <p className="text-xs text-orange-500 mt-2">
                  Son kullanım: {new Date(reserve.expires_at).toLocaleDateString('tr-TR')}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <ReserveDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={loadReserves} />

      {selectedReserve && (
        <ConvertReserveDialog
          open={convertDialogOpen}
          onOpenChange={setConvertDialogOpen}
          reserve={selectedReserve}
          onConverted={loadReserves}
        />
      )}
    </div>
  );
}
