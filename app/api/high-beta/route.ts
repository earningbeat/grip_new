import { NextResponse } from 'next/server';
import { getCachedGRIPData } from '@/lib/data/cache';

// Rule of 40: Revenue Growth (%) + Gross Margin (%) >= 40
// 적자 기업은 Operating Margin 대신 Gross Margin 사용
function calculateRuleOf40(revGrowth: number | null, grossMargin: number | null): number | null {
    if (revGrowth === null || grossMargin === null) return null;
    return (revGrowth * 100) + (grossMargin * 100);
}

// EV/Revenue 계산
function calculateEvRevenue(marketCap: number, revenue: number): number | null {
    if (!revenue || revenue <= 0 || !marketCap) return null;
    return marketCap / revenue;
}

// Cash Burn Rate (분기당)
function calculateCashBurn(netIncome: number | null): number | null {
    if (netIncome === null || netIncome >= 0) return null;
    return Math.abs(netIncome) / 4; // TTM을 4분기로 나눔
}

// Percentile 계산
function calculatePercentile(value: number, sortedArray: number[]): number {
    if (sortedArray.length === 0) return 0;
    const index = sortedArray.findIndex(v => v >= value);
    if (index === -1) return 100;
    return Math.round((index / sortedArray.length) * 100);
}

// Enrich stock with turnaround metrics
function enrichTurnaroundStock(stock: any) {
    const revGrowth = stock.revenueGrowthYoY;
    const grossMargin = stock.grossMargin;
    const opMargin = stock.operatingMargin;
    const revenue = stock.revenue;
    const marketCap = stock.marketCap;
    const netIncome = stock.netIncome;

    // Rule of 40 (Gross Margin 기준)
    const ruleOf40 = calculateRuleOf40(revGrowth, grossMargin);

    // EV/Revenue
    const evRevenue = calculateEvRevenue(marketCap, revenue);

    // Cash Burn (분기당)
    const cashBurnQuarterly = calculateCashBurn(netIncome);

    // Cash Runway 재계산 (없으면)
    let cashRunway = stock.cashRunwayQuarters;
    if (cashRunway === null && cashBurnQuarterly && cashBurnQuarterly > 0) {
        // 대략적인 추정 (현금 데이터 없이는 정확하지 않음)
        cashRunway = stock.cashRunwayQuarters;
    }

    // T-GRIP Score 재계산 (개선된 버전)
    let tGripScore = stock.tGripScore || 0;

    // Rule of 40 보너스 (0-3점)
    if (ruleOf40 !== null) {
        if (ruleOf40 >= 40) tGripScore += 3;
        else if (ruleOf40 >= 30) tGripScore += 2;
        else if (ruleOf40 >= 20) tGripScore += 1;
    }

    // Gross Margin 보너스 (0-2점)
    if (grossMargin !== null) {
        if (grossMargin >= 0.7) tGripScore += 2;
        else if (grossMargin >= 0.5) tGripScore += 1;
    }

    // Cash Runway 보너스 (0-2점)
    if (cashRunway !== null) {
        if (cashRunway >= 8) tGripScore += 2;
        else if (cashRunway >= 4) tGripScore += 1;
    }

    return {
        ...stock,
        ruleOf40,
        evRevenue,
        cashBurnQuarterly,
        tGripScore: Math.round(tGripScore * 10) / 10
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

        // 1. Filter turnaround candidates (TTM EPS <= 0, but with revenue > 0)
        const turnaroundCandidates = stocks.filter((s: any) =>
            s.ttmEps <= 0 &&
            s.revenue > 0 &&
            s.revenueGrowthYoY !== null
        );

        // 2. Enrich with turnaround metrics
        const enrichedStocks = turnaroundCandidates.map(enrichTurnaroundStock);

        // 3. Calculate Percentile Rankings
        const evRevValues = enrichedStocks.map((s: any) => s.evRevenue).filter((v: any) => v !== null && v > 0).sort((a: number, b: number) => a - b);
        const r40Values = enrichedStocks.map((s: any) => s.ruleOf40).filter((v: any) => v !== null).sort((a: number, b: number) => a - b);
        const gmValues = enrichedStocks.map((s: any) => s.grossMargin).filter((v: any) => v !== null).sort((a: number, b: number) => a - b);
        const revGrowthValues = enrichedStocks.map((s: any) => s.revenueGrowthYoY).filter((v: any) => v !== null).sort((a: number, b: number) => a - b);

        const rankedStocks = enrichedStocks.map((s: any) => {
            // EV/Revenue Percentile (lower is better, invert)
            const evRevPctl = s.evRevenue ? 100 - calculatePercentile(s.evRevenue, evRevValues) : 0;
            // Rule of 40 Percentile (higher is better)
            const r40Pctl = s.ruleOf40 ? calculatePercentile(s.ruleOf40, r40Values) : 0;
            // Gross Margin Percentile (higher is better)
            const gmPctl = s.grossMargin ? calculatePercentile(s.grossMargin, gmValues) : 0;
            // Revenue Growth Percentile (higher is better)  
            const revGrowthPctl = s.revenueGrowthYoY ? calculatePercentile(s.revenueGrowthYoY, revGrowthValues) : 0;

            // Composite Turnaround Rank
            const turnaroundRank = Math.round((evRevPctl + r40Pctl + gmPctl + revGrowthPctl) / 4);

            return {
                ...s,
                evRevPctl,
                r40Pctl,
                gmPctl,
                revGrowthPctl,
                turnaroundRank
            };
        });

        // 4. Sort by T-GRIP Score (which now includes traditional metrics bonus)
        const sortedStocks = rankedStocks.sort((a: any, b: any) =>
            (b.tGripScore || 0) - (a.tGripScore || 0)
        );

        return NextResponse.json({
            success: true,
            data: sortedStocks,
            metadata: {
                totalProcessed: stocks.length,
                totalTurnaround: sortedStocks.length,
                totalExcluded: stocks.length - sortedStocks.length,
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
