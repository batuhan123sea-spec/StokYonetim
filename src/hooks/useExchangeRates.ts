import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ExchangeRate {
  code: string;
  name: string;
  rate: number;
  change: number;
  lastUpdate: string;
}

interface ExchangeRates {
  USD: number;
  EUR: number;
  GOLD: number;
}

interface ExchangeRateResponse {
  USD: number;
  EUR: number;
  GOLD: number;
  lastUpdate: string;
  source: string;
}

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>({
    USD: 34.50, // Fallback values
    EUR: 37.20,
    GOLD: 3250.00,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [source, setSource] = useState<string>('cache');

  useEffect(() => {
    fetchRates();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching exchange rates from backend...');

      // Call Edge Function instead of direct API calls
      const { data, error: functionError } = await supabase.functions.invoke('get-exchange-rates', {
        body: {},
      });

      if (functionError) {
        console.error('❌ Edge Function error:', functionError);
        throw functionError;
      }

      if (!data) {
        console.error('❌ No data received from Edge Function');
        throw new Error('No data received');
      }

      const rateData = data as ExchangeRateResponse;

      console.log('✅ Exchange rates fetched successfully:', {
        USD: rateData.USD,
        EUR: rateData.EUR,
        GOLD: rateData.GOLD,
        source: rateData.source,
        lastUpdate: rateData.lastUpdate,
      });

      setRates({
        USD: rateData.USD,
        EUR: rateData.EUR,
        GOLD: rateData.GOLD,
      });
      setLastUpdate(rateData.lastUpdate);
      setSource(rateData.source);

      // Show warning if using fallback
      if (rateData.source === 'fallback' || rateData.source === 'error-fallback') {
        setError('⚠️ Kurlar güncellenemedi, son bilinen değerler gösteriliyor');
      }
    } catch (err: any) {
      console.error('💥 Exchange rate fetch error:', err);
      setError('⚠️ Kurlar yüklenemedi, varsayılan değerler kullanılıyor');
      // Keep using last known rates
    } finally {
      setLoading(false);
    }
  };

  return { 
    rates, 
    loading, 
    error, 
    lastUpdate, 
    source, 
    refresh: fetchRates 
  };
}
