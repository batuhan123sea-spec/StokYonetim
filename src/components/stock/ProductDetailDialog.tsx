import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Product, StockMovement } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Package, TrendingDown, TrendingUp, RefreshCw, Users, Barcode, Download } from 'lucide-react';
import { generateBarcodeImage, generateBarcodeSVG } from '@/lib/barcode';
import { ProductSupplierDialog } from './ProductSupplierDialog';

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onUpdate: () => void;
}

export function ProductDetailDialog({ open, onOpenChange, product, onUpdate }: ProductDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [productSuppliers, setProductSuppliers] = useState<any[]>([]);
  const [barcodeImage, setBarcodeImage] = useState<string>('');
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  useEffect(() => {
    if (open && product) {
      loadProductDetails();
      generateBarcode();
    }
  }, [open, product]);

  const generateBarcode = () => {
    if (product.barcode) {
      // Generate barcode image
      const imgDataUrl = generateBarcodeImage(product.barcode, 300, 100);
      setBarcodeImage(imgDataUrl);
    }
  };

  const loadProductDetails = async () => {
    setLoading(true);
    try {
      // Load stock movements
      const { data: movementsData, error: movementsError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (movementsError) throw movementsError;
      setStockMovements(movementsData || []);

      // Load product suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('product_suppliers')
        .select('*, suppliers(name)')
        .eq('product_id', product.id);

      if (suppliersError) throw suppliersError;
      setProductSuppliers(suppliersData || []);
    } catch (error: any) {
      toast.error('Detaylar yüklenirken hata: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      purchase: 'Alış',
      sale: 'Satış',
      return: 'İade',
      adjustment: 'Düzeltme',
      reserve_out: 'Rezerve Çıkış',
      reserve_in: 'Rezerve İade',
    };
    return types[type] || type;
  };

  const getMovementIcon = (type: string) => {
    if (type === 'purchase' || type === 'return' || type === 'reserve_in') {
      return <TrendingUp className="w-4 h-4 text-success" />;
    }
    return <TrendingDown className="w-4 h-4 text-destructive" />;
  };

  const handleDownloadBarcode = () => {
    if (!barcodeImage) return;
    
    const link = document.createElement('a');
    link.href = barcodeImage;
    link.download = `barkod-${product.barcode}.png`;
    link.click();
    
    toast.success('Barkod indirildi');
  };

  const profitMargin = product.purchase_price > 0 
    ? ((product.sale_price - product.purchase_price) / product.purchase_price * 100).toFixed(1)
    : '0';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {product.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Stok Miktarı</p>
                <p className="text-2xl font-bold">{product.stock_quantity}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Alış Fiyatı</p>
                <p className="text-2xl font-bold">{formatCurrency(product.purchase_price)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Satış Fiyatı</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(product.sale_price)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Kar Marjı</p>
                <p className="text-2xl font-bold text-success">{profitMargin}%</p>
              </Card>
            </div>

            {/* Barcode Section */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Barcode className="w-4 h-4" />
                  Barkod Görseli
                </h3>
                <Button variant="outline" size="sm" onClick={handleDownloadBarcode}>
                  <Download className="w-4 h-4 mr-2" />
                  İndir
                </Button>
              </div>
              {barcodeImage ? (
                <div className="flex justify-center items-center bg-white p-4 rounded border">
                  <img src={barcodeImage} alt="Barkod" className="max-w-full" />
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Barkod görseli oluşturulamadı</p>
              )}
            </Card>

            {/* Suppliers Section */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Tedarikçiler ({productSuppliers.length})
                </h3>
                <Button variant="outline" size="sm" onClick={() => setSupplierDialogOpen(true)}>
                  Yönet
                </Button>
              </div>
              
              {productSuppliers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Tedarikçi kaydı yok</p>
              ) : (
                <div className="space-y-2">
                  {productSuppliers.map((ps: any) => (
                    <div key={ps.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="font-medium">{ps.suppliers?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Son alış: {ps.last_purchase_date 
                            ? new Date(ps.last_purchase_date).toLocaleDateString('tr-TR')
                            : 'Bilinmiyor'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(ps.unit_price)}</p>
                        <p className="text-xs text-muted-foreground">{ps.currency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Stock Movements */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Stok Hareketleri ({stockMovements.length})
              </h3>
              
              {stockMovements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz stok hareketi yok</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stockMovements.map((movement: any) => (
                    <div key={movement.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getMovementIcon(movement.type)}
                        <div>
                          <p className="font-medium text-sm">{getMovementTypeLabel(movement.type)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(movement.created_at).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${movement.change_qty > 0 ? 'text-success' : 'text-destructive'}`}>
                          {movement.change_qty > 0 ? '+' : ''}{movement.change_qty}
                        </p>
                        {movement.unit_cost && (
                          <p className="text-xs text-muted-foreground">{formatCurrency(movement.unit_cost)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Management Dialog */}
      <ProductSupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        productId={product.id}
        productName={product.name}
        onSaved={() => {
          loadProductDetails();
          onUpdate();
        }}
      />
    </>
  );
}
