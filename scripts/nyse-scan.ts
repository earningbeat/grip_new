/**
 * NYSE Stock Scan Script
 * Fetches NYSE stock list and adds them to the existing cache
 */
import fs from 'fs';
import path from 'path';
import { analyzeStock } from '../lib/pipeline/analyzer';

const FMP_API_KEY = process.env.FMP_API_KEY || 'fWeo0LugXz19B3Da9tP3kwqoxnCFSlVM';
const FMP_STABLE_URL = 'https://financialmodelingprep.com/stable';
const CACHE_PATH = path.join(process.cwd(), 'data', 'grip-cache.json');
const LOG_PATH = path.join(process.cwd(), 'data', 'nyse_scan_log.txt');

// Rate limiting: 1 request per second
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function log(msg: string) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_PATH, line + '\n');
}

async function fetchNYSETickers(): Promise<string[]> {
    // Use DumbStockAPI for NYSE tickers
    const response = await fetch('https://dumbstockapi.com/stock?exchanges=NYSE');
    const data = await response.json();
    return data.map((s: any) => s.ticker);
}

async function runNYSEScan() {
    log('=== NYSE Stock Deep Scan ===');

    // 1. Load existing cache
    let cacheData: any = { stocks: [], lastUpdated: '' };
    if (fs.existsSync(CACHE_PATH)) {
        cacheData = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
        log(`Existing cache: ${cacheData.stocks.length} stocks`);
    }

    const existingTickers = new Set(cacheData.stocks.map((s: any) => s.ticker));

    // 2. Fetch NYSE ticker list
    log('Fetching NYSE ticker list from DumbStockAPI...');
    const nyseTickers = await fetchNYSETickers();
    log(`Found ${nyseTickers.length} NYSE tickers`);

    // 3. Filter out already cached tickers
    const tickersToScan = nyseTickers.filter(t => !existingTickers.has(t));
    log(`New tickers to scan: ${tickersToScan.length}`);

    // 4. Scan each ticker
    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < tickersToScan.length; i++) {
        const ticker = tickersToScan[i];

        try {
            const data = await analyzeStock(ticker, FMP_API_KEY, FMP_STABLE_URL);

            if (data) {
                cacheData.stocks.push(data);
                added++;

                if (added % 50 === 0) {
                    // Save checkpoint
                    cacheData.lastUpdated = new Date().toISOString();
                    cacheData.totalCount = cacheData.stocks.length;
                    fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheData, null, 2));
                    log(`[CHECKPOINT] Saved. Total: ${cacheData.stocks.length}`);
                }

                if (added % 100 === 0 || added === 1) {
                    log(`[${i + 1}/${tickersToScan.length}] Added: ${ticker} (GRIP: ${data.gripScore})`);
                }
            } else {
                skipped++;
            }
        } catch (err: any) {
            errors++;
            if (errors % 100 === 0) {
                log(`[ERROR] ${ticker}: ${err.message}`);
            }
        }

        // Rate limit: slightly faster for NYSE scan
        await delay(500);
    }

    // 5. Final save
    cacheData.lastUpdated = new Date().toISOString();
    cacheData.totalCount = cacheData.stocks.length;
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheData, null, 2));

    log(`\n=== NYSE SCAN COMPLETE ===`);
    log(`Added: ${added}`);
    log(`Skipped (not eligible): ${skipped}`);
    log(`Errors: ${errors}`);
    log(`Total stocks in cache: ${cacheData.stocks.length}`);
}

runNYSEScan().catch(console.error);
