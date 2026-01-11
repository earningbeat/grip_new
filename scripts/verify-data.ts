import { fetchRawFinancials, calculateMetricsFromRaw } from 'C:/Users/takko/OneDrive/.gemini/antigravity/playground/holographic-skylab/lib/pipeline/analyzer';
import { masterStorage } from 'C:/Users/takko/OneDrive/.gemini/antigravity/playground/holographic-skylab/lib/pipeline/masterStorage';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// @ts-ignore
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function verify() {
    const symbol = 'NVDA';
    const apiKey = process.env.FMP_API_KEY || 'fWeo0LugXz19B3Da9tP3kwqoxnCFSlVM';
    const baseUrl = 'https://financialmodelingprep.com/v3';

    console.log(`=== Data Verification for ${symbol} ===`);

    const raw = await fetchRawFinancials(symbol, apiKey, baseUrl);
    if (!raw) {
        console.error('Failed to fetch raw data');
        return;
    }

    masterStorage.saveRawData(symbol, raw);
    const enriched = calculateMetricsFromRaw(raw);

    if (!enriched) {
        console.error('Failed to calculate metrics');
        return;
    }

    console.log('\n--- Calculated Metrics ---');
    console.log(`Price: $${enriched.price}`);
    console.log(`Market Cap: $${(enriched.marketCap / 1e9).toFixed(2)}B`);
    console.log(`TTM Revenue: $${(enriched.revenue / 1e9).toFixed(2)}B`);
    console.log(`TTM EPS: $${enriched.ttmEps.toFixed(2)}`);
    console.log(`TTM PE: ${enriched.ttmPe?.toFixed(2)}`);
    console.log(`Gap Ratio (NTM/TTM): ${enriched.gapRatio?.toFixed(2)}`);
    console.log(`PEG: ${enriched.peg?.toFixed(2)}`);
    console.log(`Revenue Growth (YoY): ${(enriched.revenueGrowthYoY! * 100).toFixed(2)}%`);

    console.log('\n--- Quarter Check ---');
    enriched.epsHistory.forEach((h: any) => {
        console.log(`${h.period}: ${h.value}`);
    });
}

verify();
