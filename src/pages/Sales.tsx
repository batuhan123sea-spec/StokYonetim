import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Barcode, Zap, Package, AlertCircle, Undo2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { NewSaleDialog } from '@/components/sales/NewSaleDialog';
import { SalesStats } from '@/components/sales/SalesStats';
import { SaleReturnDialog } from '@/components/sales/SaleReturnDialog';

export function Sales() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus barkod input on page load
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Re-focus barkod input after dialog closes
  useEffect(() => {
    if (!dialogOpen && barcodeInputRef.current) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [dialogOpen]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setIsScanning(true);

    try {
      // Find product by barcode
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode.trim())
        .single();

      if (error || !product) {
        toast.error('Barkod bulunamadı: ' + barcode, {
          icon: <AlertCircle className="w-4 h-4" />,
        });
        setBarcode('');
        return;
      }

      // Check stock
      if (product.stock_quantity <= 0) {
        toast.error('Stokta yok: ' + product.name, {
          icon: <Package className="w-4 h-4" />,
        });
        setBarcode('');
        return;
      }

      // Success feedback
      toast.success(`Ürün bulundu: ${product.name}`, {
        description: `Stok: ${product.stock_quantity} | Fiyat: ₺${product.sale_price}`,
      });
      
      // Store scanned product for dialog to use
      sessionStorage.setItem('scannedProductId', product.id);
      
      // Open sale dialog with pre-selected product
      setBarcode('');
      setDialogOpen(true);
    } catch (error: any) {
      toast.error(error.message || 'Barkod okuma hatası');
      setBarcode('');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barkod Scanner - Prominence */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary rounded-xl shadow-lg">
            <Barcode className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl flex items-center gap-2 mb-2">
              <Zap className="w-6 h-6 text-primary animate-pulse" />
              Hızlı Satış - Barkod Okutun
            </h3>
            <form onSubmit={handleBarcodeSubmit}>
              <div className="flex gap-3">
                <Input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Barkod tabancası ile okutun veya manuel girin..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="text-lg h-14 font-mono border-2 border-primary/30 focus:border-primary"
                  disabled={isScanning}
                  autoComplete="off"
                  data-barcode-input="true"
                />
                <Button 
                  type="submit" 
                  disabled={isScanning || !barcode.trim()} 
                  size="lg"
                  className="px-8"
                >
                  {isScanning ? 'Aranıyor...' : 'Ara'}
                </Button>
              </div>
            </form>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-sm text-muted-foreground">
                💡 İpucu: Barkod tabancası ile okuttuğunuzda otomatik arama yapılır ve ürün sepete eklenir
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Satışlar</h1>
          <p className="text-muted-foreground mt-1">Hızlı satış için yukarıdan barkod okutun</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setReturnDialogOpen(true)} size="lg" variant="outline">
            <Undo2 className="w-5 h-5 mr-2" />
            İade İşlemi
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="lg" variant="outline">
            <Plus className="w-5 h-5 mr-2" />
            Manuel Satış
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <SalesStats />

      <Card className="p-12 text-center">
        <Barcode className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
        <p className="text-muted-foreground text-lg">
          Barkod tabancası ile hızlı satış yapabilirsiniz
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Veya manuel satış için yukarıdaki butonu kullanın
        </p>
      </Card>

      <NewSaleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => {
          setDialogOpen(false);
          // Re-focus barcode input
          setTimeout(() => {
            barcodeInputRef.current?.focus();
          }, 200);
        }}
      />

      <SaleReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        onReturned={() => {
          setReturnDialogOpen(false);
          // Re-focus barcode input
          setTimeout(() => {
            barcodeInputRef.current?.focus();
          }, 200);
        }}
      />
    </div>
  );
}
