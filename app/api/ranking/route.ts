import { NextResponse } from 'next/server';
import { getCachedGRIPData } from '@/lib/data/cache';
import { calculateGripScore } from '@/lib/utils/scoring';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Percentile 계산 (0-100)
function calculatePercentile(value: number, sortedArray: number[]): number {
    if (sortedArray.length === 0) return 0;
    const index = sortedArray.findIndex(v => v >= value);
    if (index === -1) return 100;
    return Math.round((index / sortedArray.length) * 100);
}

// Enrich stock with all calculable metrics
function enrichStockData(stock: any) {
    const price = stock.price || 0;
    const ttmEps = stock.ttmEps || 0;
    const ntmEps = stock.ntmEps || 0;
    const fy2Eps = stock.fy2Eps || 0;
    const peg = stock.peg;

    // === Calculate PE ratios (Force refresh from price/eps) ===
    const ttmPe = (ttmEps > 0) ? price / ttmEps : null;
    const forwardPe = (ntmEps > 0) ? price / ntmEps : null;
    const fy2Pe = (fy2Eps > 0) ? price / fy2Eps : null;

    // === NEW: Gap Ratio Redefined as TTM P/E / NTM P/E ===
    const gapRatio = (ttmPe && forwardPe && forwardPe > 0) ? ttmPe / forwardPe : null;

    // === NEW: Net Margin Calculation (TTM based) ===
    const revenue = stock.revenue || 0;
    const netIncome = stock.netIncome || 0;
    const netMargin = (revenue > 0) ? (netIncome / revenue) * 100 : 0;

    // Delta PE (TTM PE - Forward PE)
    const deltaPe = (ttmPe && forwardPe) ? ttmPe - forwardPe : null;

    // Forward EPS Growth (NTM to FY2)
    const forwardEpsGrowth = (ntmEps && fy2Eps && ntmEps > 0)
        ? ((fy2Eps / ntmEps) - 1) * 100
        : null;

    // Forward PEG (Forward PE / Forward Growth)
    const forwardPeg = (forwardPe && forwardEpsGrowth && forwardEpsGrowth > 0)
        ? forwardPe / forwardEpsGrowth
        : null;

    // === Calculate Scores using unified logic from scoring.ts ===
    const { pegScore, gapScore, totalScore: gripScore } = calculateGripScore({ peg, gapRatio });

    return {
        ...stock,
        ttmPe,
        forwardPe,
        fy2Pe,
        gapRatio,
        netMargin,
        deltaPe,
        forwardEpsGrowth,
        forwardPeg,
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
                    isCached: true,
                    benchmarkGrowth: 0
                }
            });
        }

        // 1. Enrich ALL stocks with calculated metrics
        const enrichedStocks = stocks.map(enrichStockData);

        // 2. Calculate NASDAQ Top 100 benchmark (by market cap)
        const top100ByMarketCap = [...enrichedStocks]
            .filter((s: any) => s.marketCap > 0 && s.epsGrowthRate !== null && s.epsGrowthRate > 0)
            .sort((a: any, b: any) => (b.marketCap || 0) - (a.marketCap || 0))
            .slice(0, 100);

        const benchmarkGrowth = top100ByMarketCap.length > 0
            ? top100ByMarketCap.reduce((sum: number, s: any) => sum + (s.epsGrowthRate || 0), 0) / top100ByMarketCap.length
            : 15; // 기본값 15%

        const benchmarkPe = top100ByMarketCap.length > 0
            ? top100ByMarketCap.reduce((sum: number, s: any) => sum + (s.ttmPe || 0), 0) / top100ByMarketCap.length
            : 25; // 기본값 25x

        // 3. Quality Filter: TTM EPS > 0 AND growth rate > benchmark AND valid PEG
        // + New Premium Filter: TTM P/E > benchmark P/E (Exclude "Value Traps" or unappreciated growth)
        const qualityFiltered = enrichedStocks
            .filter((s: any) =>
                s.ttmEps > 0 &&
                s.epsGrowthRate !== null &&
                s.epsGrowthRate > benchmarkGrowth &&
                s.ttmPe !== null &&
                s.ttmPe > benchmarkPe && // Premium Filter
                s.peg !== null &&
                s.peg > 0 &&
                s.peg < 10 && // PEG 10 초과는 비정상
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
                benchmarkPe: Math.round(benchmarkPe * 10) / 10,
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
