import { runAnalyzerPipeline } from '../lib/pipeline/analyzerPipeline';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function test() {
    console.log('--- Starting Pipeline Test ---');
    try {
        const result = await runAnalyzerPipeline();
        console.log('--- Execution Summary ---');
        console.log(`Total Symbols in Universe: ${result.metadata.totalProcessed}`);
        console.log(`Successfully Processed in this batch: ${result.metadata.totalSuccessful}`);
        console.log(`Failed in this batch: ${result.metadata.totalFailed}`);
        console.log(`Remaining in Cycle: ${result.metadata.pending}`);
        console.log(`Processing Time: ${result.metadata.processingTimeMs}ms`);
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

test();
