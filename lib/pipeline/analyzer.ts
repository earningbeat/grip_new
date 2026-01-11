import { calculateGripScore, calculateTGripScore } from '../utils/scoring';
import { StockData, GripStatus } from '@/types';
import { RawStockFinancials, masterStorage } from './masterStorage';

export interface EnrichedStockData extends StockData {
    isQuality: boolean;
    isTurnaround: boolean;
}

const getEps = (q: any) => q.epsdiluted ?? q.eps ?? (q.netIncome && q.weightedAverageShsOutDil ? q.netIncome / q.weightedAverageShsOutDil : 0);

/**
 * PHASE 1: Fetch Raw Financials from API
 * This function handles all network calls and returns the raw responses.
 */
export async function fetchRawFinancials(
    symbol: string,
    apiKey: string,
    baseUrl: string
): Promise<RawStockFinancials | null> {
    try {
        const quoteRes = await fetch(`${baseUrl}/quote?symbol=${symbol}&apikey=${apiKey}`);
        const quoteData = await quoteRes.json().catch(() => null);
        const quote = quoteData?.[0];

        if (!quote) return null;

        // Eligibility check
        const exchangeUpper = (quote.exchange || '').toUpperCase();
        const isNasdaq = exchangeUpper.includes('NASDAQ') || ['NGS', 'NGM', 'NCM'].includes(exchangeUpper);
        const isNyse = exchangeUpper.includes('NYSE') || ['NYQ', 'NYS'].includes(exchangeUpper);
        const isOTC = exchangeUpper.includes('OTC') || exchangeUpper.includes('PINK');

        if ((!isNasdaq && !isNyse) || isOTC) return null;

        const volume = quote.volume || 0;
        const avgVolume = quote.avgVolume || 0;
        if (volume === 0 && avgVolume === 0) return null;

        const [profileRes, incomeQRes, incomeARes, balanceRes, cashflowRes, ratiosTtmRes, keyMetricsRes, gradesRes] = await Promise.all([
            fetch(`${baseUrl}/profile?symbol=${symbol}&apikey=${apiKey}`),
            fetch(`${baseUrl}/income-statement?symbol=${symbol}&period=quarter&limit=4&apikey=${apiKey}`),
            fetch(`${baseUrl}/income-statement?symbol=${symbol}&period=annual&limit=4&apikey=${apiKey}`),
            fetch(`${baseUrl}/balance-sheet-statement?symbol=${symbol}&period=quarter&limit=1&apikey=${apiKey}`),
            fetch(`${baseUrl}/cash-flow-statement?symbol=${symbol}&period=quarter&limit=4&apikey=${apiKey}`),
            fetch(`${baseUrl}/ratios-ttm?symbol=${symbol}&apikey=${apiKey}`),
            fetch(`${baseUrl}/key-metrics-ttm?symbol=${symbol}&apikey=${apiKey}`),
            fetch(`${baseUrl}/grades?symbol=${symbol}&limit=20&apikey=${apiKey}`)
        ]);

        return {
            symbol: symbol.toUpperCase(),
            quote,
            profile: (await profileRes.json().catch(() => null))?.[0],
            incomeQuarterly: await incomeQRes.json().catch(() => []),
            incomeAnnual: await incomeARes.json().catch(() => []),
            balanceSheetQuarterly: await balanceRes.json().catch(() => []),
            cashFlowQuarterly: await cashflowRes.json().catch(() => []),
            ratiosTtm: (await ratiosTtmRes.json().catch(() => null))?.[0],
            keyMetrics: (await keyMetricsRes.json().catch(() => null))?.[0],
            lastUpdated: new Date().toISOString()
        } as any; // Temporary cast to match legacy fields if needed
    } catch (error) {
        console.error(`[Analyzer] Error fetching raw data for ${symbol}:`, error);
        return null;
    }
}

/**
 * PHASE 2: Calculate Metrics from Raw Data
 * PURE FUNCTION that transforms RawStockFinancials into EnrichedStockData.
 */
export function calculateMetricsFromRaw(raw: RawStockFinancials): EnrichedStockData | null {
    const { quote, incomeQuarterly, incomeAnnual, cashFlowQuarterly, ratiosTtm, keyMetrics, profile, balanceSheetQuarterly } = raw as any;

    if (!quote || !incomeQuarterly || incomeQuarterly.length === 0) return null;

    // 1. 재무 총합 (TTM)
    let ttmRev = 0, ttmOpInc = 0, ttmNetInc = 0, ttmGrossProf = 0;
    incomeQuarterly.forEach((q: any) => {
        ttmRev += Number(q.revenue) || 0;
        ttmOpInc += Number(q.operatingIncome) || 0;
        ttmNetInc += Number(q.netIncome) || 0;
        ttmGrossProf += Number(q.grossProfit) || 0;
    });

    // 2. Revenue Growth (YoY)
    let revGrowth = null;
    if (Array.isArray(incomeAnnual) && incomeAnnual.length >= 2) {
        const currentRev = Number(incomeAnnual[0].revenue) || 0;
        const prevRev = Number(incomeAnnual[1].revenue) || 0;
        if (prevRev > 0) revGrowth = (currentRev / prevRev) - 1;
    }

    // 3. Margins
    const gMargin = ttmRev > 0 ? ttmGrossProf / ttmRev : null;
    const oMargin = ttmRev > 0 ? ttmOpInc / ttmRev : null;
    const nMargin = ttmRev > 0 ? ttmNetInc / ttmRev : null;

    // 4. EPS & CAGR
    const ttmEps = incomeQuarterly.reduce((s: number, q: any) => s + (Number(getEps(q)) || 0), 0);

    // 5. NTM & Estimations - IMPROVED
    let growthEst = 0;
    if (Array.isArray(incomeAnnual) && incomeAnnual.length >= 4) {
        const cur = Number(getEps(incomeAnnual[0])) || 0;
        const old = Number(getEps(incomeAnnual[3])) || 0;
        if (cur > 0 && old > 0) {
            growthEst = (Math.pow(cur / old, 1 / 3) - 1) * 100;
        } else if (cur > old) {
            // 적자에서 개선 중: 매출 성장률의 50%를 EPS 성장으로 추정
            growthEst = revGrowth !== null ? Math.abs(revGrowth) * 50 : 10;
        }
    }

    // NTM EPS: 최소 5% 성장 가정 (성장률이 유효한 경우)
    const effectiveGrowth = Math.max(5, growthEst);
    let ntmEps = ttmEps * (1 + effectiveGrowth / 100);

    // 적자 기업 특별 처리: 매출 성장이 있으면 적자 감소 추정
    if (ttmEps < 0 && revGrowth !== null && revGrowth > 0.1) {
        // 매출 20% 성장시 적자 30% 감소 가정
        ntmEps = ttmEps * (1 - Math.min(0.5, revGrowth * 1.5));
    }

    // 6. PE & PEG
    const price = quote.price || 0;
    const ttmPe = ttmEps > 0 ? price / ttmEps : null;
    const forwardPe = ntmEps > 0 ? price / ntmEps : null;
    const gapRatio = ttmEps !== 0 ? ntmEps / ttmEps : null;

    const keyMetricsPeg = keyMetrics?.pegRatioTTM;
    const manualPeg = (ttmPe && growthEst >= 5) ? ttmPe / growthEst : null;
    const peg = keyMetricsPeg || manualPeg;

    // 7. Cash & Burn - 적자 기업만 runway 계산
    let runway = null;
    const totalCash = (balanceSheetQuarterly?.[0]?.cashAndCashEquivalents || 0) + (balanceSheetQuarterly?.[0]?.shortTermInvestments || 0);
    const latestNetIncome = incomeQuarterly[0]?.netIncome || 0;
    const quarterlyBurn = Math.abs(latestNetIncome);

    // 흑자 기업은 runway null (무한대가 아닌 '해당없음')
    if (latestNetIncome < 0 && quarterlyBurn > 0) {
        runway = totalCash / quarterlyBurn;
    }


    // TTM History for frontend charts
    const epsHistory = [...incomeQuarterly].reverse().map((q: any) => ({
        period: `${q.calendarYear} Q${q.period.replace('Q', '')}`,
        value: Number(getEps(q)) || 0
    }));
    const revenueHistory = [...incomeQuarterly].reverse().map((q: any) => ({
        period: `${q.calendarYear} Q${q.period.replace('Q', '')}`,
        value: Number(q.revenue) || 0
    }));
    const fcfHistory = Array.isArray(cashFlowQuarterly) ? [...cashFlowQuarterly].reverse().map((q: any) => ({
        period: `${q.calendarYear} Q${q.period.replace('Q', '')}`,
        value: Number(q.freeCashFlow) || 0
    })) : [];

    const stockData: StockData = {
        ticker: raw.symbol,
        symbol: raw.symbol,
        name: profile?.companyName ?? quote.name ?? raw.symbol,
        sector: profile?.sector ?? 'Unknown',
        industry: profile?.industry ?? 'Unknown',
        exchange: quote.exchange,
        price,
        marketCap: quote.marketCap,
        beta: quote.beta,
        revenue: ttmRev,
        revenueGrowthYoY: revGrowth,
        operatingIncome: ttmOpInc,
        netIncome: ttmNetInc,
        grossMargin: gMargin,
        operatingMargin: oMargin,
        netMargin: nMargin,
        ttmEps,
        fy1Eps: ttmEps,
        fy2Eps: null,
        ntmEps,
        ttmPe,
        forwardPe,
        gapRatio,
        epsGrowthRate: growthEst,
        peg,
        gripStatus: (ttmEps > 0 && ntmEps > 0) ? 'high' : 'watch',
        isQualityGrowth: true,
        epsWarnings: [],
        turnaroundDelta: ntmEps - ttmEps,
        tGripScore: 0,
        evRevenue: ttmRev > 0 ? quote.marketCap / ttmRev : null,
        evGrossProfit: ttmGrossProf > 0 ? quote.marketCap / ttmGrossProf : null,
        burnRate: quarterlyBurn,
        psr: ttmRev > 0 ? quote.marketCap / ttmRev : null,
        ruleOf40: (revGrowth !== null && oMargin !== null) ? (revGrowth * 100 + oMargin * 100) : null,
        freeCashFlow: fcfHistory.reduce((s, d) => s + d.value, 0),
        cashAndShortTermInvestments: totalCash,
        cashRunwayQuarters: runway,
        cagr3Y: growthEst,
        epsHistory,
        revenueHistory,
        fcfHistory,
        fiscalYearEndMonth: 12,
        lastUpdated: new Date().toISOString(),
        isQuality: ttmEps > 0 && ntmEps > 0,
        isTurnaround: ttmEps <= 0 && ntmEps > 0,
        latestQEps: getEps(incomeQuarterly[0]),
        latestQDate: incomeQuarterly[0]?.date,
        latestQPeriod: incomeQuarterly[0]?.period
    } as any;

    const { pegScore, gapScore, totalScore: gripScore } = calculateGripScore({
        peg: stockData.peg,
        gapRatio: stockData.gapRatio
    });

    const tGripScore = calculateTGripScore(
        stockData.ttmEps,
        stockData.ntmEps || 0,
        stockData.cashRunwayQuarters,
        stockData.revenueGrowthYoY ?? null
    );

    const enriched: EnrichedStockData = {
        ...stockData,
        pegScore,
        gapScore,
        gripScore,
        tGripScore,
        isQuality: gripScore > 3,
        isTurnaround: tGripScore > 2
    };

    return enriched;
}

/**
 * Legacy wrapper for compatibility
 */
export async function analyzeStock(
    symbol: string,
    apiKey: string,
    baseUrl: string
): Promise<EnrichedStockData | null> {
    const raw = await fetchRawFinancials(symbol, apiKey, baseUrl);
    if (!raw) return null;

    // Auto-save to Master DB on fetch
    masterStorage.saveRawData(symbol, raw);

    return calculateMetricsFromRaw(raw);
}
