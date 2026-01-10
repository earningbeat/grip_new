import { NextResponse } from 'next/server';
import { getCachedGRIPData } from '@/lib/data/cache';

export async function GET() {
    try {
        const { stocks, lastUpdated } = getCachedGRIPData();

        // High-Beta = TTM EPS 음수인 종목 (턴어라운드 후보)
        const candidates = stocks.filter((s: any) =>
            s.ttmEps < 0 && s.tGripScore && s.tGripScore > 0
        );

        // T-GRIP 점수순 정렬
        const sorted = candidates
            .sort((a: any, b: any) => (b.tGripScore || 0) - (a.tGripScore || 0));

        return NextResponse.json({
            success: true,
            data: sorted,
            metadata: {
                totalProcessed: stocks.length,
                totalExcluded: stocks.length - candidates.length,
                timestamp: lastUpdated || new Date().toISOString(),
                isCached: true
            }
        });
    } catch (error) {
        console.error('High-Beta API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch high-beta data'
        }, { status: 500 });
    }
}
