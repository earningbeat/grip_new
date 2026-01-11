import { NextResponse } from 'next/server';
import { getCachedGRIPData } from '@/lib/data/cache';
import { StockData } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Rule of 40: Revenue Growth (%) + Gross Margin (%) >= 40 (Stable version)
function calculateRuleOf40(revGrowth: number | null, grossMargin: number | null): number | null {
    if (revGrowth === null || grossMargin === null) return null;
    // Cap revenue growth to 100% for stability in Rule of 40 calculation if it's an extreme outlier
    const stableGrowth = Math.min(100, revGrowth * 100);
    return stableGrowth + (grossMargin * 100);
}

// Enrich stock with turnaround metrics and requested column data
function enrichTurnaroundStock(stock: StockData): StockData {
    const revGrowth = stock.revenueGrowthYoY ?? null;
    const grossMargin = stock.grossMargin ?? null;
    const revenue = stock.revenue ?? 0;
    const marketCap = stock.marketCap;
    const ttmEps = stock.ttmEps;
    const ntmEps = stock.ntmEps ?? 0;

    // 1. Gap Ratio (Absolute Value Comparison)
    // How much the negative gap is closing
    const absoluteGapRatio = (Math.abs(ttmEps) + ntmEps);

    // 2. Rule of 40 (Capped for stability)
    const ruleOf40 = calculateRuleOf40(revGrowth, grossMargin);

    // 3. PSR (Price to Sales Ratio)
    const psr = (revenue > 0) ? marketCap / revenue : null;

    // 4. EV/Revenue (Enterprise Value / Revenue)
    // EV = Market Cap + Total Debt - Cash
    const totalCash = stock.cashAndShortTermInvestments ?? 0;
    // Since we don't have totalDebt directly, approximate EV as marketCap (common simplification)
    // or use the evRevenue already calculated in analyzer.ts if available
    const evRevenue = stock.evRevenue ?? (revenue > 0 ? marketCap / revenue : null);

    // T-GRIP Score (Refined for Turnaround)
    let tGripScore = 0;

    // Growth & Efficiency (Rule of 40) - 0 to 5 points
    if (ruleOf40 !== null) {
        tGripScore += Math.min(5, ruleOf40 / 10);
    }

    // Valuation Check (PSR/EV-Rev) - 0 to 3 points
    if (psr !== null && psr < 3) tGripScore += 3;
    else if (psr !== null && psr < 5) tGripScore += 2;
    else if (psr !== null && psr < 10) tGripScore += 1;

    // Cash Runway - 0 to 2 points
    if (stock.cashRunwayQuarters !== null) {
        if (stock.cashRunwayQuarters >= 8) tGripScore += 2;
        else if (stock.cashRunwayQuarters >= 4) tGripScore += 1;
    }

    // Fix cagr3Y if it's NaN or invalid
    const cleanCagr3Y = (stock.cagr3Y !== null && !isNaN(stock.cagr3Y)) ? stock.cagr3Y : null;

    return {
        ...stock,
        absoluteGapRatio,
        ruleOf40,
        psr,
        evRevenue,
        cagr3Y: cleanCagr3Y,
        tGripScore: Math.round(tGripScore * 10) / 10
    };
}

export async function GET() {
    try {
        const { stocks, lastUpdated } = getCachedGRIPData();

        if (!stocks || stocks.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Debug: Log total stocks received
        console.log(`[High-Beta] Total stocks from cache: ${stocks.length}`);

        // 1. Turnaround Filter: 더 유연하게 후보 선정
        // - TTM EPS < 0 AND NTM EPS > 0 (적자->흑자 전환)
        // - OR TTM EPS < 0 AND 매출 성장 20% 이상 (고성장 적자 기업)
        // - OR TTM EPS < 1 AND NTM EPS > TTM EPS (EPS 개선 중)
        // - OR isTurnaround 플래그
        // - OR 고성장 (CAGR > 30%) AND 낮은 수익성 (Net Margin < 5%)
        const turnaroundCandidates = stocks.filter((s: StockData) => {
            const hasNegativeEps = s.ttmEps < 0;
            const hasPositiveNtmEps = s.ntmEps !== null && s.ntmEps > 0;
            const isEpsImproving = s.ntmEps !== null && s.ntmEps > s.ttmEps;
            const hasHighRevGrowth = (s.revenueGrowthYoY ?? 0) > 0.2;
            const hasRevenue = (s.revenue ?? 0) > 0;
            const isHighGrowthLowProfit = (s.cagr3Y ?? 0) > 30 && (s.netMargin ?? 0) < 0.05;
            const isLowEps = s.ttmEps < 1;

            return (
                (
                    (hasNegativeEps && hasPositiveNtmEps) ||                    // 적자 -> 흑자
                    (hasNegativeEps && hasHighRevGrowth) ||                     // 적자 + 고성장
                    (isLowEps && isEpsImproving) ||                             // 저수익 + 개선중
                    s.isTurnaround === true ||                                  // 플래그
                    isHighGrowthLowProfit                                       // 고성장 저수익
                )
                && hasRevenue
            );
        });

        console.log(`[High-Beta] Turnaround candidates found: ${turnaroundCandidates.length}`);

        // 2. Enrich
        const enrichedStocks = turnaroundCandidates.map(enrichTurnaroundStock);

        // 3. Sort by T-GRIP Score
        const sortedStocks = enrichedStocks.sort((a, b) =>
            (b.tGripScore || 0) - (a.tGripScore || 0)
        );

        return NextResponse.json({
            success: true,
            data: sortedStocks,
            metadata: {
                totalTurnaround: sortedStocks.length,
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
