import fs from 'fs';
import path from 'path';
import { analyzeStock } from '../lib/pipeline/analyzer';

const FMP_API_KEY = process.env.FMP_API_KEY || 'fWeo0LugXz19B3Da9tP3kwqoxnCFSlVM';
const FMP_STABLE_URL = 'https://financialmodelingprep.com/stable';
const CACHE_PATH = path.join(process.cwd(), 'data', 'grip-cache.json');
const LOG_PATH = path.resolve(process.cwd(), 'data', 'scan_log.txt');

function log(msg: string) {
    const time = new Date().toISOString();
    const formatted = `[${time}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(LOG_PATH, formatted);
}

async function deepCollect() {
    log('=== NASDAQ Targeted Deep Scan (Optimized Starting) ===');

    try {
        log('1. Fetching NASDAQ Universe from DumbStockAPI...');
        const res = await fetch('https://dumbstockapi.com/stock?exchanges=NASDAQ');
        const listData = await res.json();
        const tickers = listData.map((item: any) => item.ticker).filter((t: string) => /^[A-Z]{1,5}$/.test(t));
        log(`   Target Universe: ${tickers.length} stocks discovered.`);

        log('\n2. Starting Optimized Deep Analysis (Rate Limited 1 RPS)...');
        log(`   Estimated Duration: ~3.5 hours (Early-exit enabled).`);

        const results = [];
        for (let i = 0; i < tickers.length; i++) {
            const symbol = tickers[i];

            try {
                // analyzer.ts now fetches quote first and skips if not NASDAQ or <$100M Market Cap.
                // This saves 5 tokens per non-target stock.
                const data = await analyzeStock(symbol, FMP_API_KEY, FMP_STABLE_URL);

                if (data) {
                    results.push(data);
                }

                if ((i + 1) % 10 === 0 || i === tickers.length - 1) {
                    log(`   [Progress] ${i + 1}/${tickers.length} checked. Found Quality (>$100M): ${results.length}`);
                }
            } catch (err: any) {
                log(`   [Error] ${symbol}: ${err.message}`);
            }
        }

        const cacheData = {
            lastUpdated: new Date().toISOString(),
            totalCount: results.length,
            stocks: results
        };

        const dataDir = path.dirname(CACHE_PATH);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheData, null, 2));
        log(`\n=== SCAN COMPLETE: ${results.length} stocks cached ===`);

    } catch (e: any) {
        log(`FATAL ERROR: ${e.message}`);
        process.exit(1);
    }
}

deepCollect();
