import { analyzeStock } from './analyzer';
import { ProgressTracker } from './progressTracker';
import fs from 'fs';
import path from 'path';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/v3'; // Changed to v3 for constituent endpoints

interface RunAnalyzerPipelineResult {
    data: any[];
    metadata: {
        totalProcessed: number;
        totalSuccessful: number;
        totalFailed: number;
        pending: number;
        timestamp: string;
        processingTimeMs: number;
    };
}

/**
 * Get symbols from FMP API (NASDAQ, NYSE)
 */
async function getUniverseSymbols(): Promise<string[]> {
    if (!FMP_API_KEY) throw new Error('FMP_API_KEY not configured');

    console.log('[Pipeline] Fetching NASDAQ and NYSE constituents...');

    try {
        const [nasdaqRes, nyseRes] = await Promise.all([
            fetch(`${FMP_BASE_URL}/nasdaq_constituent?apikey=${FMP_API_KEY}`),
            fetch(`${FMP_BASE_URL}/nyse_constituent?apikey=${FMP_API_KEY}`)
        ]);

        const [nasdaqData, nyseData] = await Promise.all([
            nasdaqRes.json(),
            nyseRes.json()
        ]);

        const symbols = new Set<string>();

        if (Array.isArray(nasdaqData)) {
            nasdaqData.forEach(item => { if (item.symbol) symbols.add(item.symbol); });
        }

        if (Array.isArray(nyseData)) {
            nyseData.forEach(item => { if (item.symbol) symbols.add(item.symbol); });
        }

        return Array.from(symbols);
    } catch (error) {
        console.error('[Pipeline] Failed to fetch universe symbols:', error);
        return [];
    }
}

/**
 * Run the analyzer pipeline using analyzer.ts with Progress Tracking
 */
export async function runAnalyzerPipeline(): Promise<RunAnalyzerPipelineResult> {
    const startTime = Date.now();

    if (!FMP_API_KEY) {
        throw new Error('FMP_API_KEY environment variable is required');
    }

    const cachePath = path.join(process.cwd(), 'data', 'grip-cache.json');
    let existingResults: any[] = [];

    // 1. Load existing cache to preserve data
    if (fs.existsSync(cachePath)) {
        try {
            const cacheRaw = fs.readFileSync(cachePath, 'utf8');
            const parsed = JSON.parse(cacheRaw);
            existingResults = Array.isArray(parsed.stocks) ? parsed.stocks : [];
        } catch (e) {
            console.warn('[Pipeline] Could not load legacy cache:', e);
        }
    }

    // 2. Initialize Universe and Progress Tracker
    // Cycle ID is typically current date YYYY-MM-DD
    const cycleId = new Date().toISOString().split('T')[0];
    const tracker = new ProgressTracker(cycleId);

    const allSymbols = await getUniverseSymbols();
    if (allSymbols.length === 0) {
        throw new Error('No symbols to process');
    }

    tracker.initialize(allSymbols);
    const progress = tracker.getProgress();

    // 3. Process Batch
    // Restricted by Vercel 5-minute timeout and FMP 60 RPM
    // Each stock takes ~8 API calls in analyzer.ts
    // 60 RPM / 8 API calls ≈ 7-8 stocks per minute
    // In 5 minutes, we can safely do ~30-35 stocks
    const batchSize = 30;
    const delayMs = 1200; // Increased delay to stay under 60 RPM considering 8 calls/stock

    const batch = tracker.getNextBatch(batchSize);
    console.log(`[Pipeline] Processing batch of ${batch.length} tickers... (Total Completed: ${progress.completed}/${progress.total})`);

    const batchResults: any[] = [];
    let successful = 0;
    let failed = 0;

    for (const symbol of batch) {
        try {
            // Re-using the logic from analyzer.ts
            const data = await analyzeStock(symbol, FMP_API_KEY!, FMP_BASE_URL);
            if (data) {
                batchResults.push(data);
                successful++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`[Pipeline] Error analyzing ${symbol}:`, error);
            failed++;
        }

        // Sequential delay to be super safe with rate limits
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // 4. Merge results and save
    // We update existing records or append new ones
    const stockMap = new Map(existingResults.map(s => [s.ticker, s]));
    batchResults.forEach(s => stockMap.set(s.ticker, s));

    const finalStocks = Array.from(stockMap.values());

    const cacheData = {
        lastUpdated: new Date().toISOString(),
        stocks: finalStocks,
        cycleStatus: {
            cycleId,
            completed: progress.completed + successful + failed,
            total: progress.total
        }
    };

    const dataDir = path.dirname(cachePath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));

    // Update progress state
    tracker.markAsCompleted(batch);

    const processingTimeMs = Date.now() - startTime;
    console.log(`[Pipeline] Batch completed in ${processingTimeMs}ms. Success: ${successful}, Failed: ${failed}`);

    return {
        data: batchResults,
        metadata: {
            totalProcessed: progress.total ?? 0,
            totalSuccessful: successful,
            totalFailed: failed,
            pending: tracker.getProgress().pending ?? 0,
            timestamp: new Date().toISOString(),
            processingTimeMs
        }
    };
}

