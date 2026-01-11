import { analyzeStock } from './analyzer';
import fs from 'fs';
import path from 'path';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

interface RunAnalyzerPipelineResult {
    data: any[];
    metadata: {
        totalProcessed: number;
        totalSuccessful: number;
        totalFailed: number;
        timestamp: string;
        processingTimeMs: number;
    };
}

/**
 * Get NASDAQ constituent symbols from FMP API
 */
async function getNasdaqConstituents(): Promise<string[]> {
    if (!FMP_API_KEY) throw new Error('FMP_API_KEY not configured');

    const res = await fetch(`${FMP_BASE_URL}/nasdaq-constituent?apikey=${FMP_API_KEY}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
        console.error('[Pipeline] Failed to fetch NASDAQ constituents:', data);
        return [];
    }

    return data.map((item: any) => item.symbol).filter(Boolean);
}

/**
 * Run the analyzer pipeline using analyzer.ts
 * This replaces the old processor.ts logic
 */
export async function runAnalyzerPipeline(): Promise<RunAnalyzerPipelineResult> {
    const startTime = Date.now();

    if (!FMP_API_KEY) {
        throw new Error('FMP_API_KEY environment variable is required');
    }

    // 1. Get NASDAQ symbols
    console.log('[Pipeline] Fetching NASDAQ constituents...');
    const symbols = await getNasdaqConstituents();
    console.log(`[Pipeline] Found ${symbols.length} NASDAQ symbols`);

    if (symbols.length === 0) {
        throw new Error('No symbols to process');
    }

    // 2. Process each symbol with rate limiting
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    // Optimized for Vercel 5-minute limit and FMP Premium rate limits
    const batchSize = 10; // Process 10 stocks at a time
    const delayMs = 500; // 500ms delay between batches
    const maxStocks = 1500; // Limit to ensure completion within 5 minutes

    const symbolsToProcess = symbols.slice(0, maxStocks);
    console.log(`[Pipeline] Processing ${symbolsToProcess.length}/${symbols.length} stocks (limited for time constraints)`);

    for (let i = 0; i < symbolsToProcess.length; i += batchSize) {
        const batch = symbolsToProcess.slice(i, i + batchSize);

        console.log(`[Pipeline] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbolsToProcess.length / batchSize)} (${i}/${symbolsToProcess.length})...`);

        const batchResults = await Promise.all(
            batch.map(async (symbol) => {
                try {
                    const data = await analyzeStock(symbol, FMP_API_KEY!, FMP_BASE_URL);
                    if (data) {
                        successful++;
                        return data;
                    }
                    failed++;
                    return null;
                } catch (error) {
                    console.error(`[Pipeline] Error analyzing ${symbol}:`, error);
                    failed++;
                    return null;
                }
            })
        );

        results.push(...batchResults.filter(Boolean));

        // Delay between batches (except for last batch)
        if (i + batchSize < symbols.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    console.log(`[Pipeline] Completed: ${successful} successful, ${failed} failed`);

    // 3. Save to cache file
    const cacheData = {
        lastUpdated: new Date().toISOString(),
        stocks: results
    };

    const cachePath = path.join(process.cwd(), 'data', 'grip-cache.json');

    // Ensure data directory exists
    const dataDir = path.dirname(cachePath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    console.log(`[Pipeline] Cache saved to ${cachePath}`);

    const processingTimeMs = Date.now() - startTime;

    return {
        data: results,
        metadata: {
            totalProcessed: symbols.length,
            totalSuccessful: successful,
            totalFailed: failed,
            timestamp: new Date().toISOString(),
            processingTimeMs
        }
    };
}
