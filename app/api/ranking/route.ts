import { NextResponse } from 'next/server';
import { getCachedGRIPData } from '@/lib/data/cache';

export async function GET() {
    try {
        const { stocks, lastUpdated } = getCachedGRIPData();

        if (!stocks || stocks.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
                metadata: {
                    totalProcessed: 0,
                    totalExcluded: 0,
                    timestamp: new Date().toISOString(),
                    isCached: true
                }
            });
        }

        // Quality = TTM EPS 양수인 종목, GRIP 점수순
        const qualityStocks = stocks
            .filter((s: any) => s.ttmEps > 0 && s.gripScore > 0)
            .sort((a: any, b: any) => (b.gripScore || 0) - (a.gripScore || 0));

        return NextResponse.json({
            success: true,
            data: qualityStocks,
            metadata: {
                totalProcessed: stocks.length,
                totalExcluded: stocks.length - qualityStocks.length,
                timestamp: lastUpdated || new Date().toISOString(),
                isCached: true
            }
        });
    } catch (error) {
        console.error('Ranking API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch ranking data'
        }, { status: 500 });
    }
}
