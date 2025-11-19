/**
 * Exchange rates fetching utility
 * Fetches live USD, EUR, and Gold prices via Edge Function (backend proxy)
 */

import { supabase } from './supabase';

export interface ExchangeRates {
  usd: {
    buying: number;
    selling: number;
  };
  eur: {
    buying: number;
    selling: number;
  };
  gold: {
    buying: number;
    selling: number;
  };
  lastUpdate: string;
}

/**
 * Fetch exchange rates via Edge Function (solves CORS issues)
 */
export async function fetchExchangeRates(): Promise<ExchangeRates> {
  console.log('📊 Fetching exchange rates from backend Edge Function...');

  try {
    const { data, error } = await supabase.functions.invoke('get-exchange-rates', {
      body: {},
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      throw error;
    }

    if (!data) {
      console.error('❌ No data received from Edge Function');
      throw new Error('No data received');
    }

    // Transform backend response to ExchangeRates format
    const rates: ExchangeRates = {
      usd: {
        buying: data.USD * 0.998, // Apply 0.2% spread for buying rate
        selling: data.USD,
      },
      eur: {
        buying: data.EUR * 0.998,
        selling: data.EUR,
      },
      gold: {
        buying: data.GOLD * 0.998,
        selling: data.GOLD,
      },
      lastUpdate: data.lastUpdate || new Date().toISOString(),
    };

    console.log('✅ Exchange rates fetched successfully:', {
      usd: rates.usd.selling,
      eur: rates.eur.selling,
      gold: rates.gold.selling,
      source: data.source,
    });

    return rates;
  } catch (error) {
    console.error('💥 Failed to fetch from Edge Function:', error);
    throw error;
  }
}

/**
 * Fetch exchange rates with fallback to cache/static values
 */
export async function fetchExchangeRatesWithFallback(): Promise<ExchangeRates> {
  try {
    return await fetchExchangeRates();
  } catch (error) {
    console.error('⚠️ All exchange rate sources failed, using fallback values:', error);
    
    // Return last known good values (güncel piyasa ortalaması)
    return {
      usd: {
        buying: 34.65,
        selling: 34.75,
      },
      eur: {
        buying: 37.45,
        selling: 37.60,
      },
      gold: {
        buying: 3180.00,
        selling: 3210.00,
      },
      lastUpdate: new Date().toISOString(),
    };
  }
}

/**
 * Format exchange rate for display
 */
export function formatRate(rate: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}
