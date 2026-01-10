import { runPipeline } from '../lib/pipeline/processor';
import * as fmpApi from '../lib/api/fmp';

/**
 * Verification Script: Simulating Growth Plan Constraints
 */
async function verifyGrowthPlanCompatibility() {
    console.log('=== Starting Verification: Growth Plan Compatibility ===\n');

    // 1. Mock FMP API behavior for Growth Plan (Optional: if we want to force simulation)
    // For now, we'll just run it against the real API and observe the logs.
    // The rate limiter should keep us under 60 RPM.

    try {
        console.log('Step 1: Running Pipeline (First 5 stocks)...');
        // We might want to modify processor.ts temporarily to only process 5 stocks for testing
        // but for now, let's just see if it handles the first few correctly.

        const result = await runPipeline();

        console.log('\n--- Results ---');
        console.log(`Total Processed: ${result.metadata.totalProcessed}`);
        console.log(`Success Count: ${result.data.length}`);
        console.log(`Excluded Count: ${result.metadata.totalExcluded}`);

        if (result.data.length > 0) {
            const sample = result.data[0];
            console.log('\nSample Data Point:');
            console.log(`Ticker: ${sample.ticker}`);
            console.log(`TTM EPS: ${sample.ttmEps}`);
            console.log(`NTM EPS: ${sample.ntmEps}`);
            console.log(`Forward P/E: ${sample.forwardPe}`);
            console.log(`Gap Ratio: ${sample.gapRatio}`);
            console.log(`GRIP Status: ${sample.gripStatus}`);
        }

    } catch (e) {
        console.error('Verification failed:', e);
    }
}

// Run the verification
verifyGrowthPlanCompatibility();
