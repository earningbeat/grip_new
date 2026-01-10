import fs from 'fs';
import path from 'path';

const CACHE_PATH = path.join(process.cwd(), 'data', 'grip-cache.json');

function cleanCache() {
    console.log('=== Cleaning Cache (Advanced Heuristics) ===');

    if (!fs.existsSync(CACHE_PATH)) {
        console.error('Cache file not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    const initialCount = data.stocks.length;

    const KNOWN_DELISTED = ['ORAN', 'ANAT', 'TGP', 'TREC', 'ATAX', 'DFFN', 'CPAAW', 'NOVAW', 'HHGWW', 'ALSAW', 'LBBBW'];

    // Apply strict filters
    const filteredStocks = data.stocks.filter((s: any) => {
        const symbol = s.ticker || s.symbol;
        const price = s.price || 0;
        const eps = s.ttmEps || 0;
        const ntmEps = s.ntmEps || 0;
        const rev = s.revenue || 0;
        const netInc = s.netIncome || 0;
        const mktCap = s.marketCap || 0;
        const growth = s.epsGrowthRate || 0;

        // 0. Known Delisted/Bad
        if (KNOWN_DELISTED.includes(symbol)) {
            console.log(`- Removing ${symbol}: Known delisted/bad ticker`);
            return false;
        }

        // 1. Missing Basic Market Data
        if (price <= 0 || mktCap <= 0) {
            console.log(`- Removing ${symbol}: Missing price ($${price}) or market cap ($${mktCap})`);
            return false;
        }

        // 2. Missing Revenue
        if (rev <= 0) {
            console.log(`- Removing ${symbol}: Zero or missing revenue`);
            return false;
        }

        // 3. Extreme Growth Outlier (Ghost Tickers / Stale Estimates)
        // If NTM EPS is > 5x TTM EPS for a profitable company, it's likely a data error
        if (eps > 0.5 && ntmEps > eps * 5) {
            console.log(`- Removing ${symbol}: Suspiciously high NTM EPS ($${ntmEps.toFixed(2)}) vs TTM ($${eps.toFixed(2)}) - Possible stale data`);
            return false;
        }

        // 4. Critical: EPS > Price
        if (eps > price && price > 0) {
            console.log(`- Removing ${symbol}: EPS ($${eps}) > Price ($${price})`);
            return false;
        }

        // 5. Impossible P/E Ratio (< 0.5x)
        if (eps > 0 && price > 0) {
            const pe = price / eps;
            if (pe < 0.5) {
                console.log(`- Removing ${symbol}: PE ratio (${pe.toFixed(2)}x) too low`);
                return false;
            }
        }

        // 6. Suspiciously low PE for high growth
        if (eps > 0 && price > 0 && growth > 50) {
            const pe = price / eps;
            if (pe < 1.0) {
                console.log(`- Removing ${symbol}: Suspicious PE (${pe.toFixed(2)}x) for high growth (${growth.toFixed(1)}%)`);
                return false;
            }
        }

        // 7. Net Income > Revenue * 1.5
        if (rev > 0 && Math.abs(netInc) > rev * 1.5) {
            console.log(`- Removing ${symbol}: Net Income ($${netInc}) > 1.5x Revenue ($${rev})`);
            return false;
        }

        // 8. Market Cap < 1M
        if (mktCap > 0 && mktCap < 1000000) {
            console.log(`- Removing ${symbol}: Market cap ($${mktCap}) too small`);
            return false;
        }

        return true;
    });

    const removedCount = initialCount - filteredStocks.length;
    data.stocks = filteredStocks;
    data.totalCount = filteredStocks.length;
    data.lastUpdated = new Date().toISOString();

    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));

    console.log(`\nSuccessfully cleaned cache.`);
    console.log(`- Initial stocks: ${initialCount}`);
    console.log(`- Removed (Corrupted/Stale): ${removedCount}`);
    console.log(`- Final stocks: ${filteredStocks.length}`);
}

cleanCache();
