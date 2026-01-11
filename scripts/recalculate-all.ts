import fs from 'fs';
import path from 'path';
import { masterStorage } from '../lib/pipeline/masterStorage';
import { calculateMetricsFromRaw } from '../lib/pipeline/analyzer';

const CACHE_PATH = path.join(process.cwd(), 'data', 'grip-cache.json');

async function recalculate() {
    console.log('=== Local Recalculation Engine (Zero API Mode) ===');

    const symbols = masterStorage.getAllSymbols();
    console.log(`Found ${symbols.length} stocks in Master DB.`);

    const results = [];
    let count = 0;

    for (const symbol of symbols) {
        const raw = masterStorage.getRawData(symbol);
        if (raw) {
            const enriched = calculateMetricsFromRaw(raw);
            if (enriched) {
                results.push(enriched);
            }
        }

        count++;
        if (count % 100 === 0) {
            console.log(`Processed ${count}/${symbols.length}...`);
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

    console.log(`\n=== SUCCESS: ${results.length} stocks recalculated and saved to cache ===`);
}

recalculate();
