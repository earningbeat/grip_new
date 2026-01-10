import fs from 'fs';
import path from 'path';

async function countNasdaq() {
    const API_KEY = 'fWeo0LugXz19B3Da9tP3kwqoxnCFSlVM'; // Using the key found in scripts
    const BASE_URL = 'https://financialmodelingprep.com/stable';

    console.log('Fetching stock list...');
    const res = await fetch(`${BASE_URL}/stock-list?apikey=${API_KEY}`);
    const list = await res.json();

    const nasdaq = list.filter((s: any) =>
        (s.exchangeShortName === 'NASDAQ' || s.exchange === 'Nasdaq Global Select') &&
        /^[A-Z]{1,5}$/.test(s.symbol)
    );

    console.log(`Total NASDAQ symbols found: ${nasdaq.length}`);

    // Check market cap briefly (we need to batch quote for this)
    const batchSize = 100;
    let over100M = 0;

    // Just test first 500 to extrapolate
    const testSample = nasdaq.slice(0, 500);
    const symbols = testSample.map((s: any) => s.symbol).join(',');
    const quoteRes = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${API_KEY}`);
    const quotes = await quoteRes.json();

    const countOver100M = quotes.filter((q: any) => q.marketCap > 100000000).length;
    console.log(`In first 500: ${countOver100M} are > $100M`);

    const estimatedTotal = Math.round((countOver100M / 500) * nasdaq.length);
    console.log(`Estimated total NASDAQ > $100M: ~${estimatedTotal}`);
}

countNasdaq();
