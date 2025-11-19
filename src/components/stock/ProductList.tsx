import { useState } from 'react';
import { Product } from '@/types';
import { formatCurrency, getStockStatus } from '@/lib/utils';
import { Edit, AlertCircle, CheckCircle, AlertTriangle, Eye, Barcode, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductDetailDialog } from './ProductDetailDialog';

const getUnitLabel = (unit: string) => {
  const labels: Record<string, string> = {
    ADET: 'Ad',
    LITRE: 'L',
    METRE: 'm',
    GRAM: 'g',
    CM: 'cm',
    KG: 'kg',
    M2: 'm²',
    M3: 'm³',
  };
  return labels[unit] || unit;
};

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onUpdate?: () => void;
}

export function ProductList({ products, onEdit, onUpdate }: ProductListProps) {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setDetailDialogOpen(true);
  };

  return (
    <>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ürün Adı</th>
              <th>Barkod</th>
              <th>Birim</th>
              <th>Stok</th>
              <th>Alış Fiyatı</th>
              <th>Satış Fiyatı</th>
              <th>Kar Marjı</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const status = getStockStatus(product.stock_quantity, product.min_stock_level);
              const StatusIcon = status === 'success' ? CheckCircle : status === 'warning' ? AlertTriangle : AlertCircle;
              
              return (
                <tr key={product.id}>
                  <td>
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-muted-foreground">{product.description}</div>
                    )}
                  </td>
                  <td>
                    {product.barcode ? (
                      <div className="flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-muted-foreground" />
                        <code className="text-xs bg-secondary px-2 py-1 rounded">
                          {product.barcode}
                        </code>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{getUnitLabel(product.unit)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{product.stock_quantity}</span>
                      <span className="text-xs text-muted-foreground">/ {product.min_stock_level}</span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="font-semibold">{formatCurrency(product.purchase_price)} {product.purchase_currency}</div>
                      {product.purchase_currency !== 'TRY' && (
                        <div className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(product.purchase_price * product.purchase_fx_rate)} TL
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{formatCurrency(product.sale_price)}</td>
                  <td>
                    <span className={`font-semibold ${Number(product.profit_margin) > 20 ? 'text-success' : 'text-warning'}`}>
                      %{Number(product.profit_margin || 0).toFixed(1)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 ${
                        status === 'success' ? 'text-success' : 
                        status === 'warning' ? 'text-warning' : 
                        'text-destructive'
                      }`} />
                      <span className={`badge badge-${status === 'success' ? 'success' : status === 'warning' ? 'warning' : 'danger'}`}>
                        {status === 'success' ? 'Normal' : status === 'warning' ? 'Düşük' : 'Tükendi'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleViewDetails(product)} title="Detayları Gör">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onEdit(product)} title="Düzenle">
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

      {selectedProduct && (
        <ProductDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          product={selectedProduct}
          onUpdate={() => {
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </>
  );
}
