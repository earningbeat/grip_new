import { NextResponse } from 'next/server';
import { getCachedGRIPData } from '@/lib/data/cache';
import { analyzeStock } from '@/lib/pipeline/analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker } = await params;
    const symbol = ticker.toUpperCase();

    try {
        // 1. 캐시 우선 확인
        const { stocks } = getCachedGRIPData();
        const cached = stocks.find(s => s.symbol === symbol || s.ticker === symbol);

        if (cached) {
            console.log(`[Cache Hit] ${symbol}`);
            return NextResponse.json({
                success: true,
                data: cached,
                metadata: {
                    symbol,
                    isCached: true,
                    timestamp: new Date().toISOString()
                }
            });
        }

        // 2. 캐시에 없으면 실시간 분석 (API Key 필요)
        if (!FMP_API_KEY) throw new Error('FMP_API_KEY not configured for live analysis');

        console.log(`[Cache Miss] Real-time analysis for ${symbol}`);
        const data = await analyzeStock(symbol, FMP_API_KEY, FMP_BASE_URL);

        if (!data) {
            return NextResponse.json({ success: false, error: 'Symbol not found or unsupported' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: data,
            metadata: {
                symbol,
                isCached: false,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error(`[API/analyze/${symbol}] Error:`, error);
        return NextResponse.json({ success: false, error: 'Analysis failed' }, { status: 500 });
    }
}
