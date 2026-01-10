import { NextResponse } from 'next/server';
import { getCachedGRIPData } from '@/lib/data/cache';

// Calculate individual scores for legacy cached data
function enrichStockData(stock: any) {
    // If already calculated, return as-is
    if (stock.pegScore !== null && stock.pegScore !== undefined &&
        stock.gapScore !== null && stock.gapScore !== undefined) {
        return stock;
    }

    const peg = stock.peg;
    const gapRatio = stock.gapRatio;

    // PEG Score (0-5점): PEG 0.5 이하 = 5점, PEG 2.5 이상 = 0점
    let pegScore = 0;
    if (peg !== null && peg > 0) {
        pegScore = Math.max(0, Math.min(5, (2.5 - peg) * 2.5));
        pegScore = Math.round(pegScore * 10) / 10;
    }

    // GAP Score (0-5점): Gap Ratio 1.5 이상 = 5점, 1.0 이하 = 0점
    let gapScore = 0;
    if (gapRatio !== null && gapRatio > 0) {
        gapScore = Math.max(0, Math.min(5, (gapRatio - 1) * 10));
        gapScore = Math.round(gapScore * 10) / 10;
    }

    // Recalculate GRIP Score if missing
    const gripScore = stock.gripScore ?? Math.round((pegScore + gapScore) * 10) / 10;

    return {
        ...stock,
        pegScore,
        gapScore,
        gripScore
    };
}

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

        // Enrich and filter quality stocks
        const qualityStocks = stocks
            .map(enrichStockData)
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
