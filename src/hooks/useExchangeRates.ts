import { useState, useEffect } from 'react';

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

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>({
    USD: 34.50, // Fallback values
    EUR: 37.20,
    GOLD: 3250.00,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Try multiple sources for reliability
      const sources = [
        fetchFromCollectAPI,
        fetchFromGenelpara,
        fetchFromECB,
      ];

      for (const fetchFn of sources) {
        try {
          const result = await fetchFn();
          if (result) {
            setRates(result);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Rate fetch failed, trying next source:', err);
          continue;
        }
      }

      // If all sources fail, keep using last known rates
      console.warn('All rate sources failed, using cached rates');
      setError('Kurlar güncellenemedi, son bilinen değerler gösteriliyor');
    } catch (err) {
      console.error('Exchange rate fetch error:', err);
      setError('Kurlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  return { rates, loading, error, refresh: fetchRates };
}

// CollectAPI - Turkish financial data provider
async function fetchFromCollectAPI(): Promise<ExchangeRates | null> {
  try {
    const response = await fetch('https://api.collectapi.com/economy/allCurrency', {
      headers: {
        'authorization': 'apikey 0s4MQqDdKzFSP6JLE7Ewjk:34L8RUKTxAHqJOIZxgC1w2',
        'content-type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('CollectAPI failed');

    const data = await response.json();
    
    if (!data.success || !data.result) throw new Error('Invalid CollectAPI response');

    const usd = data.result.find((r: any) => r.code === 'USD');
    const eur = data.result.find((r: any) => r.code === 'EUR');
    const gold = data.result.find((r: any) => r.code === 'GA'); // Gram altın

    if (!usd || !eur) throw new Error('Missing currency data');

    return {
      USD: parseFloat(usd.selling) || 34.50,
      EUR: parseFloat(eur.selling) || 37.20,
      GOLD: gold ? parseFloat(gold.selling) : 3250.00,
    };
  } catch (error) {
    console.error('CollectAPI error:', error);
    return null;
  }
}

// Genelpara.com - Turkish exchange rates
async function fetchFromGenelpara(): Promise<ExchangeRates | null> {
  try {
    const response = await fetch('https://www.genelpara.com/embed/para-birimleri.json');
    
    if (!response.ok) throw new Error('Genelpara failed');

    const data = await response.json();

    const usd = data.USD;
    const eur = data.EUR;
    const gold = data.gram_altin;

    if (!usd || !eur) throw new Error('Missing currency data');

    return {
      USD: parseFloat(usd.satis) || 34.50,
      EUR: parseFloat(eur.satis) || 37.20,
      GOLD: gold ? parseFloat(gold.satis) : 3250.00,
    };
  } catch (error) {
    console.error('Genelpara error:', error);
    return null;
  }
}

// European Central Bank - Fallback for EUR
async function fetchFromECB(): Promise<ExchangeRates | null> {
  try {
    // ECB only provides EUR/USD, we need to convert to TRY
    // This is a simplified fallback, not fully accurate
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) throw new Error('ECB fallback failed');

    const data = await response.json();

    if (!data.rates || !data.rates.TRY || !data.rates.EUR) {
      throw new Error('Missing rate data');
    }

    return {
      USD: parseFloat(data.rates.TRY) || 34.50,
      EUR: parseFloat(data.rates.TRY) * parseFloat(data.rates.EUR) || 37.20,
      GOLD: 3250.00, // Cannot fetch gold from this source
    };
  } catch (error) {
    console.error('ECB fallback error:', error);
    return null;
  }
}
