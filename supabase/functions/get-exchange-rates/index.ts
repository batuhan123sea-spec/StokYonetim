import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface ExchangeRates {
  USD: number;
  EUR: number;
  GOLD: number;
  lastUpdate: string;
  source: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📊 Fetching exchange rates...');

    // Try multiple sources in order of preference
    const sources = [
      fetchFromCollectAPI,
      fetchFromTCMB,
      fetchFromExchangeRateAPI,
      fetchFromGenelpara,
    ];

    let rates: ExchangeRates | null = null;

    for (const fetchFn of sources) {
      try {
        console.log(`⏳ Trying source: ${fetchFn.name}`);
        rates = await fetchFn();
        if (rates) {
          console.log(`✅ Successfully fetched rates from ${rates.source}`);
          break;
        }
      } catch (err) {
        console.warn(`⚠️ ${fetchFn.name} failed:`, err);
        continue;
      }
    }

    if (!rates) {
      console.error('❌ All sources failed, using fallback rates');
      // Return fallback rates
      rates = {
        USD: 34.50,
        EUR: 37.20,
        GOLD: 3250.00,
        lastUpdate: new Date().toISOString(),
        source: 'fallback',
      };
    }

    return new Response(JSON.stringify(rates), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('💥 Exchange rates error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        USD: 34.50,
        EUR: 37.20,
        GOLD: 3250.00,
        lastUpdate: new Date().toISOString(),
        source: 'error-fallback',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 even on error to prevent frontend crashes
      }
    );
  }
});

// Source 1: CollectAPI (Turkish financial data)
async function fetchFromCollectAPI(): Promise<ExchangeRates | null> {
  const response = await fetch('https://api.collectapi.com/economy/allCurrency', {
    headers: {
      'authorization': 'apikey 0s4MQqDdKzFSP6JLE7Ewjk:34L8RUKTxAHqJOIZxgC1w2',
      'content-type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CollectAPI HTTP ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.success || !data.result) {
    throw new Error('Invalid CollectAPI response');
  }

  const usd = data.result.find((r: any) => r.code === 'USD');
  const eur = data.result.find((r: any) => r.code === 'EUR');
  const gold = data.result.find((r: any) => r.code === 'GA');

  if (!usd || !eur) {
    throw new Error('Missing currency data in CollectAPI');
  }

  return {
    USD: parseFloat(usd.selling),
    EUR: parseFloat(eur.selling),
    GOLD: gold ? parseFloat(gold.selling) : 3250.00,
    lastUpdate: new Date().toISOString(),
    source: 'CollectAPI',
  };
}

// Source 2: TCMB (Central Bank of Turkey) - XML format
async function fetchFromTCMB(): Promise<ExchangeRates | null> {
  const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml');

  if (!response.ok) {
    throw new Error(`TCMB HTTP ${response.status}`);
  }

  const xmlText = await response.text();
  
  // Parse XML (simple regex approach for key values)
  const usdMatch = xmlText.match(/<Currency[^>]*CurrencyCode="USD"[^>]*>[\s\S]*?<ForexSelling>([\d.]+)<\/ForexSelling>/);
  const eurMatch = xmlText.match(/<Currency[^>]*CurrencyCode="EUR"[^>]*>[\s\S]*?<ForexSelling>([\d.]+)<\/ForexSelling>/);
  
  if (!usdMatch || !eurMatch) {
    throw new Error('Could not parse TCMB XML');
  }

  // Gold rate from TCMB is in different format, skip for now
  return {
    USD: parseFloat(usdMatch[1]),
    EUR: parseFloat(eurMatch[1]),
    GOLD: 3250.00, // TCMB doesn't provide gold in same format
    lastUpdate: new Date().toISOString(),
    source: 'TCMB',
  };
}

// Source 3: ExchangeRate-API (Reliable but limited)
async function fetchFromExchangeRateAPI(): Promise<ExchangeRates | null> {
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

  if (!response.ok) {
    throw new Error(`ExchangeRateAPI HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.rates || !data.rates.TRY) {
    throw new Error('Missing TRY rate in ExchangeRateAPI');
  }

  const usdToTry = parseFloat(data.rates.TRY);
  
  // Get EUR to USD rate
  const eurToUsd = data.rates.EUR ? parseFloat(data.rates.EUR) : 0.92;
  const eurToTry = usdToTry / eurToUsd;

  return {
    USD: usdToTry,
    EUR: eurToTry,
    GOLD: 3250.00, // Cannot fetch gold from this API
    lastUpdate: new Date().toISOString(),
    source: 'ExchangeRateAPI',
  };
}

// Source 4: Genelpara (Turkish exchange rates)
async function fetchFromGenelpara(): Promise<ExchangeRates | null> {
  const response = await fetch('https://www.genelpara.com/embed/para-birimleri.json');

  if (!response.ok) {
    throw new Error(`Genelpara HTTP ${response.status}`);
  }

  const data = await response.json();

  const usd = data.USD;
  const eur = data.EUR;
  const gold = data.gram_altin;

  if (!usd || !eur) {
    throw new Error('Missing currency data in Genelpara');
  }

  return {
    USD: parseFloat(usd.satis),
    EUR: parseFloat(eur.satis),
    GOLD: gold ? parseFloat(gold.satis) : 3250.00,
    lastUpdate: new Date().toISOString(),
    source: 'Genelpara',
  };
}
