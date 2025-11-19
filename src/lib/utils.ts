import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Currency } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: Currency = 'TRY'): string {
  const symbols: Record<Currency, string> = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
  };
  
  return `${symbols[currency]}${amount.toFixed(2)}`;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function calculateTax(amount: number, rate: number, included: boolean): number {
  if (included) {
    return amount - (amount / (1 + rate / 100));
  }
  return amount * (rate / 100);
}

export function getStockStatus(quantity: number, minLevel: number): 'success' | 'warning' | 'danger' {
  if (quantity === 0) return 'danger';
  if (quantity <= minLevel) return 'warning';
  return 'success';
}
