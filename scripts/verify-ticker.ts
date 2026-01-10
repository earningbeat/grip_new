import fs from 'fs';
import path from 'path';

const symbol = process.argv[2] || 'AAPL';
const CACHE_PATH = path.join(process.cwd(), 'data', 'grip-cache.json');

async function verifyTicker(symbol: string) {
    console.log(`=== Verifying ${symbol} ===`);

    // 1. Get Cache Data
    let cacheStock = null;
    if (fs.existsSync(CACHE_PATH)) {
        const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
        cacheStock = data.stocks.find((s: any) => s.ticker === symbol);
    }

    if (cacheStock) {
        console.log('FMP Cache Data:');
        console.log(`  EPS (TTM): $${cacheStock.ttmEps}`);
        console.log(`  Price: $${cacheStock.price}`);
        console.log(`  P/E: ${(cacheStock.price / cacheStock.ttmEps).toFixed(2)}x`);
    } else {
        console.log('Ticker not found in FMP cache.');
    }

    // 2. Fetch Yahoo Data (Direct API)
    console.log('\nFetching Yahoo Finance Data...');
    try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!res.ok) {
            console.error(`Yahoo API error: ${res.status}`);
            const text = await res.text();
            console.error(text);
            return;
        }

        const data: any = await res.json();
        const quote = data?.quoteResponse?.result?.[0];

        if (!quote) {
            console.log(`Yahoo: Symbol "${symbol}" not found.`);
            return;
        }

        console.log('Yahoo Finance Data:');
        console.log(`  Name: ${quote.longName || quote.shortName}`);
        console.log(`  EPS (TTM): $${quote.epsTrailingTwelveMonths}`);
        console.log(`  Price: $${quote.regularMarketPrice}`);
        const yPe = quote.regularMarketPrice / quote.epsTrailingTwelveMonths;
        console.log(`  P/E: ${yPe.toFixed(2)}x`);

        if (cacheStock) {
            const epsDiff = Math.abs(quote.epsTrailingTwelveMonths - cacheStock.ttmEps);
            if (epsDiff > 0.1) {
                console.log('\n⚠️  DISCREPANCY DETECTED!');
                console.log(`  EPS Difference: $${epsDiff.toFixed(2)}`);
            } else {
                console.log('\n✅ Data matches well.');
            }
        }
    } catch (err: any) {
        console.error('Error fetching Yahoo data:', err.message);
    }
}

verifyTicker(symbol).catch(console.error);
