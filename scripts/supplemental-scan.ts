/**
 * Supplemental scan script to add missing tickers to the cache
 * Uses FMP profile API directly for each ticker
 */
import fs from 'fs';
import path from 'path';
import { analyzeStock } from '../lib/pipeline/analyzer';

const FMP_API_KEY = process.env.FMP_API_KEY || 'fWeo0LugXz19B3Da9tP3kwqoxnCFSlVM';
const FMP_STABLE_URL = 'https://financialmodelingprep.com/stable';
const CACHE_PATH = path.join(process.cwd(), 'data', 'grip-cache.json');

// List of known missing tickers to add
const MISSING_TICKERS = [
    'PATH',  // UiPath
    'BROS',  // Dutch Bros
    'RIVN',  // Rivian
    'LCID',  // Lucid Motors
    'SOFI',  // SoFi
    'HOOD',  // Robinhood
    'AFRM',  // Affirm
    'UPST',  // Upstart
    'COIN',  // Coinbase
    'RKLB',  // Rocket Lab
];

async function supplementalScan() {
    console.log('=== Supplemental Scan: Adding Missing Tickers ===\n');

    // Load existing cache
    let cacheData: any = { stocks: [], lastUpdated: '' };
    if (fs.existsSync(CACHE_PATH)) {
        cacheData = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
        console.log(`Existing cache: ${cacheData.stocks.length} stocks\n`);
    }

    const existingTickers = new Set(cacheData.stocks.map((s: any) => s.ticker));
    const newStocks: any[] = [];

    for (const ticker of MISSING_TICKERS) {
        if (existingTickers.has(ticker)) {
            console.log(`[SKIP] ${ticker} already in cache`);
            continue;
        }

        try {
            console.log(`[SCAN] ${ticker}...`);
            const data = await analyzeStock(ticker, FMP_API_KEY, FMP_STABLE_URL);

            if (data) {
                newStocks.push(data);
                console.log(`  ✓ Added: ${ticker} (GRIP: ${data.gripScore}, TTM EPS: ${data.ttmEps?.toFixed(2)})`);
            } else {
                console.log(`  ✗ Not eligible or no data: ${ticker}`);
            }
        } catch (err: any) {
            console.log(`  ✗ Error: ${ticker} - ${err.message}`);
        }
    }

    if (newStocks.length > 0) {
        cacheData.stocks = [...cacheData.stocks, ...newStocks];
        cacheData.lastUpdated = new Date().toISOString();
        cacheData.totalCount = cacheData.stocks.length;

        fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheData, null, 2));
        console.log(`\n=== DONE: Added ${newStocks.length} new stocks. Total: ${cacheData.stocks.length} ===`);
    } else {
        console.log('\n=== No new stocks added ===');
    }
}

supplementalScan();
