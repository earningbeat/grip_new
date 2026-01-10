import fs from 'fs';
import path from 'path';
import { analyzeStock } from '../lib/pipeline/analyzer';

const FMP_API_KEY = process.env.FMP_API_KEY || 'fWeo0LugXz19B3Da9tP3kwqoxnCFSlVM';
const FMP_STABLE_URL = 'https://financialmodelingprep.com/stable';

async function verifyAndCount() {
    console.log('--- Initial Universe Check ---');

    // 1. Get Universe
    const listRes = await fetch(`${FMP_STABLE_URL}/stock-list?apikey=${FMP_API_KEY}`);
    const fullList = await listRes.json();

    if (!Array.isArray(fullList)) {
        console.error('Failed to fetch stock list:', fullList);
        return;
    }

    const nasdaqCandidates = fullList.filter((s: any) => {
        const exShort = s.exchangeShortName ? s.exchangeShortName.toUpperCase() : '';
        const exLong = s.exchange ? s.exchange.toUpperCase() : '';
        const isNasdaq = exShort.includes('NASDAQ') || exLong.includes('NASDAQ');
        const isValidTicker = /^[A-Z]{1,5}$/.test(s.symbol);
        return isNasdaq && isValidTicker;
    });

    console.log(`Total NASDAQ Symbols: ${nasdaqCandidates.length}`);

    // 2. Fetch Quotes in batches of 100 to check Market Cap
    let over100M = [];
    const batchSize = 100;

    // To be fast, we'll only check up to 2000 symbols for this report
    const limitCheck = Math.min(nasdaqCandidates.length, 2500);

    for (let i = 0; i < limitCheck; i += batchSize) {
        const batch = nasdaqCandidates.slice(i, i + batchSize);
        const symbols = batch.map(s => s.symbol).join(',');
        const quoteRes = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${FMP_API_KEY}`);
        const quotes = await quoteRes.json();

        if (Array.isArray(quotes)) {
            for (const q of quotes) {
                if (q.marketCap >= 100000000) {
                    over100M.push(q.symbol);
                }
            }
        }
        process.stdout.write(`\rChecking Market Cap: ${i + batchSize}/${limitCheck}... Found ${over100M.length}`);
    }

    console.log(`\n\n[Report]`);
    console.log(`NASDAQ Symbols Analyzed: ${limitCheck}`);
    console.log(`NASDAQ Socks > $100M: ${over100M.length}`);

    const estimatedTotal = Math.round((over100M.length / limitCheck) * nasdaqCandidates.length);
    console.log(`Estimated total NASDAQ > $100M: ~${estimatedTotal}`);

    // 3. Test Deep Analysis for 1 stock
    console.log('\n--- Testing Deep Scan (1 stock) ---');
    if (over100M.length > 0) {
        const data = await analyzeStock(over100M[0], FMP_API_KEY, FMP_STABLE_URL);
        console.log('Result for', over100M[0], ':', JSON.stringify({
            symbol: data?.symbol,
            ttmEps: data?.ttmEps,
            cashRunway: data?.cashRunwayQuarters,
            gripScore: data?.gripScore
        }, null, 2));
    }
}

verifyAndCount();
