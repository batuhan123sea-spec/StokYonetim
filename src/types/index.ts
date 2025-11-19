export type Currency = 'TRY' | 'USD' | 'EUR';
export type PaymentType = 'NAKIT' | 'KREDI_KARTI' | 'FHT' | 'HVL' | 'HAVALE' | 'DIGER';
export type ReserveStatus = 'open' | 'completed' | 'expired' | 'cancelled';
export type TransactionType = 'reserve' | 'sale' | 'payment' | 'refund' | 'opening';
export type StockMovementType = 'purchase' | 'sale' | 'return' | 'reserve_out' | 'reserve_in' | 'adjustment';
export type RiskLevel = 'Düşük' | 'Orta' | 'Yüksek';
export type PaymentStatus = 'BEKLIYOR' | 'ODEME_YAPILDI' | 'KISMIPAID' | 'GECIKTI';
export type ProductUnit = 'ADET' | 'LITRE' | 'METRE' | 'GRAM' | 'CM' | 'KG' | 'M2' | 'M3';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  category_id?: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  barcode_image_url?: string;
  unit: ProductUnit;
  stock_quantity: number;
  min_stock_level: number;
  purchase_price: number;
  purchase_currency: Currency;
  purchase_fx_rate: number;
  sale_price: number;
  profit_margin?: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductSupplier {
  id: string;
  user_id: string;
  product_id: string;
  supplier_id: string;
  unit_price: number;
  currency: Currency;
  fx_rate_at_purchase: number;
  last_purchase_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  vergi_no?: string;
  opening_balance: number;
  opening_currency: Currency;
  current_balance: number;
  credit_limit?: number;
  risk_durumu: RiskLevel;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  customer_id?: string;
  sale_no: string;
  sale_date: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  tax_included: boolean;
  tax_rate: number;
  payment_type: PaymentType;
  currency: Currency;
  fx_rate: number;
  is_reserved: boolean;
  is_from_reserve: boolean;
  reserve_id?: string;
  vade_tarihi?: string;
  odeme_durumu: PaymentStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  customer_id: string;
  amount: number;
  currency: Currency;
  payment_type: PaymentType;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface Reserve {
  id: string;
  reserve_no: string;
  customer_id?: string;
  date: string;
  is_converted: boolean;
  converted_at?: string;
  expires_at?: string;
  status: ReserveStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface ReserveItem {
  id: string;
  reserve_id: string;
  product_id: string;
  product?: Product;
  qty_reserved: number;
  unit_price: number;
  created_at: string;
}

export interface CustomerTransaction {
  id: string;
  customer_id: string;
  type: TransactionType;
  ref_id?: string;
  date: string;
  amount: number;
  currency: Currency;
  fx_rate_to_tl: number;
  balance_after: number;
  notes?: string;
  created_by?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  change_qty: number;
  type: StockMovementType;
  ref_type?: string;
  ref_id?: string;
  unit_cost?: number;
  fx_rate?: number;
  created_at: string;
  user_id?: string;
  notes?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  entries: Array<{
    account_code: string;
    debit: number;
    credit: number;
    description: string;
  }>;
  ref_type?: string;
  ref_id?: string;
  description?: string;
  created_by?: string;
  immutable: boolean;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  customer_id: string;
  week_start: string;
  week_end: string;
  opening_balance: number;
  total_sales: number;
  total_payments: number;
  closing_balance: number;
  generated_at: string;
}

export interface ProductWithCategory extends Product {
  category?: Category;
}

export interface ProductWithSuppliers extends Product {
  suppliers?: Array<ProductSupplier & { supplier: Supplier }>;
}

export interface SaleWithDetails extends Sale {
  customer?: Customer;
  items: Array<SaleItem & { product: Product }>;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  totalSales: number;
  todaySales: number;
  pendingBalance: number;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  vergi_no?: string;
  toplam_alacak: number;
  kredi_limiti?: number;
  risk_durumu: RiskLevel;
  geciken_tutar: number;
  son_islem_tarihi?: string;
  geciken_fatura_sayisi: number;
}
