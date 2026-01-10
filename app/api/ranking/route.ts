import { NextResponse } from 'next/server';
import { getCachedGRIPData } from '@/lib/data/cache';

// Percentile 계산 (0-100)
function calculatePercentile(value: number, sortedArray: number[]): number {
    if (sortedArray.length === 0) return 0;
    const index = sortedArray.findIndex(v => v >= value);
    if (index === -1) return 100;
    return Math.round((index / sortedArray.length) * 100);
}

// Rule of 40 계산: Revenue Growth (%) + Operating Margin (%) >= 40
function calculateRuleOf40(revGrowth: number | null, opMargin: number | null): number | null {
    if (revGrowth === null || opMargin === null) return null;
    return (revGrowth * 100) + (opMargin * 100);
}

// EV/Revenue 계산
function calculateEvRevenue(marketCap: number, revenue: number, netDebt: number = 0): number | null {
    if (!revenue || revenue <= 0) return null;
    const ev = marketCap + netDebt; // 단순화: net debt = 0 가정
    return ev / revenue;
}

// Enrich stock with calculated metrics
function enrichStockData(stock: any) {
    const peg = stock.peg;
    const gapRatio = stock.gapRatio;

    // PEG Score (0-5점)
    let pegScore = 0;
    if (peg !== null && peg > 0 && peg < 10) {
        pegScore = Math.max(0, Math.min(5, (2.5 - peg) * 2.5));
        pegScore = Math.round(pegScore * 10) / 10;
    }

    // GAP Score (0-5점)
    let gapScore = 0;
    if (gapRatio !== null && gapRatio > 0) {
        gapScore = Math.max(0, Math.min(5, (gapRatio - 1) * 10));
        gapScore = Math.round(gapScore * 10) / 10;
    }

    const gripScore = Math.round((pegScore + gapScore) * 10) / 10;

    // Rule of 40
    const ruleOf40 = calculateRuleOf40(stock.revenueGrowthYoY, stock.operatingMargin);

    // EV/Revenue
    const evRevenue = calculateEvRevenue(stock.marketCap, stock.revenue);

    return {
        ...stock,
        pegScore,
        gapScore,
        gripScore,
        ruleOf40,
        evRevenue
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
                    isCached: true,
                    benchmarkGrowth: 0
                }
            });
        }

        // 1. Enrich all stocks
        const enrichedStocks = stocks.map(enrichStockData);

        // 2. Calculate NASDAQ Top 100 benchmark (by market cap)
        const top100ByMarketCap = [...enrichedStocks]
            .filter((s: any) => s.marketCap > 0 && s.epsGrowthRate !== null)
            .sort((a: any, b: any) => (b.marketCap || 0) - (a.marketCap || 0))
            .slice(0, 100);

        const benchmarkGrowth = top100ByMarketCap.length > 0
            ? top100ByMarketCap.reduce((sum: number, s: any) => sum + (s.epsGrowthRate || 0), 0) / top100ByMarketCap.length
            : 15; // 기본값 15%

        // 3. Quality Filter: TTM EPS > 0 AND growth rate > benchmark
        const qualityFiltered = enrichedStocks
            .filter((s: any) =>
                s.ttmEps > 0 &&
                s.epsGrowthRate !== null &&
                s.epsGrowthRate > benchmarkGrowth &&
                s.gripScore > 0
            );

        // 4. Calculate Percentile Rankings
        const pegValues = qualityFiltered.map((s: any) => s.peg).filter((v: any) => v !== null && v > 0).sort((a: number, b: number) => a - b);
        const gapValues = qualityFiltered.map((s: any) => s.gapRatio).filter((v: any) => v !== null).sort((a: number, b: number) => a - b);
        const growthValues = qualityFiltered.map((s: any) => s.epsGrowthRate).filter((v: any) => v !== null).sort((a: number, b: number) => a - b);

        const rankedStocks = qualityFiltered.map((s: any) => {
            // PEG Percentile (lower is better, so invert)
            const pegPctl = s.peg ? 100 - calculatePercentile(s.peg, pegValues) : 0;
            // GAP Percentile (higher is better)
            const gapPctl = s.gapRatio ? calculatePercentile(s.gapRatio, gapValues) : 0;
            // Growth Percentile (higher is better)
            const growthPctl = s.epsGrowthRate ? calculatePercentile(s.epsGrowthRate, growthValues) : 0;

            // Composite Rank (average of percentiles)
            const compositeRank = Math.round((pegPctl + gapPctl + growthPctl) / 3);

            return {
                ...s,
                pegPctl,
                gapPctl,
                growthPctl,
                compositeRank
            };
        });

        // 5. Sort by composite rank
        const sortedStocks = rankedStocks.sort((a: any, b: any) =>
            (b.compositeRank || 0) - (a.compositeRank || 0)
        );

        return NextResponse.json({
            success: true,
            data: sortedStocks,
            metadata: {
                totalProcessed: stocks.length,
                totalQualified: qualityFiltered.length,
                totalExcluded: stocks.length - qualityFiltered.length,
                benchmarkGrowth: Math.round(benchmarkGrowth * 10) / 10,
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
