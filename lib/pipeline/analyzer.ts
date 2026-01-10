import { calculateGripScore, calculateTGripScore } from '../utils/scoring';
import { StockData, GripStatus } from '@/types';

export interface EnrichedStockData extends StockData {
    isQuality: boolean;
    isTurnaround: boolean;
}

const getEps = (q: any) => q.epsdiluted ?? q.eps ?? (q.netIncome && q.weightedAverageShsOutDil ? q.netIncome / q.weightedAverageShsOutDil : 0);

export async function analyzeStock(
    symbol: string,
    apiKey: string,
    baseUrl: string
): Promise<EnrichedStockData | null> {
    try {
        // 1. Fetch Quote first to check eligibility (saves 5 calls for ~50% of stocks)
        const quoteRes = await fetch(`${baseUrl}/quote?symbol=${symbol}&apikey=${apiKey}`);
        const quoteData = await quoteRes.json().catch(() => null);
        const quote = quoteData?.[0];

        if (!quote) return null;

        // Check basic eligibility: NASDAQ or NYSE (excl. OTC)
        const exchangeUpper = (quote.exchange || '').toUpperCase();
        const isNasdaq = exchangeUpper.includes('NASDAQ') ||
            exchangeUpper === 'NGS' ||
            exchangeUpper === 'NGM' ||
            exchangeUpper === 'NCM';
        const isNyse = exchangeUpper.includes('NYSE') ||
            exchangeUpper === 'NYQ' ||
            exchangeUpper === 'NYS';
        const isOTC = exchangeUpper.includes('OTC') || exchangeUpper.includes('PINK');

        // If not (NASDAQ or NYSE) or is OTC, skip
        if ((!isNasdaq && !isNyse) || isOTC) return null;

        // 2. Fetch the rest only for eligible stocks
        const [profileRes, incomeQRes, incomeARes, balanceRes, cashflowRes, gradesRes, ratiosTtmRes] = await Promise.all([
            fetch(`${baseUrl}/profile?symbol=${symbol}&apikey=${apiKey}`),
            fetch(`${baseUrl}/income-statement?symbol=${symbol}&period=quarter&limit=4&apikey=${apiKey}`),
            fetch(`${baseUrl}/income-statement?symbol=${symbol}&period=annual&limit=4&apikey=${apiKey}`),
            fetch(`${baseUrl}/balance-sheet-statement?symbol=${symbol}&period=quarter&limit=1&apikey=${apiKey}`),
            fetch(`${baseUrl}/cash-flow-statement?symbol=${symbol}&period=quarter&limit=1&apikey=${apiKey}`),
            fetch(`${baseUrl}/grades?symbol=${symbol}&limit=20&apikey=${apiKey}`),
            fetch(`${baseUrl}/ratios-ttm/${symbol}?apikey=${apiKey}`)  // Fetch pre-calculated PEG
        ]);

        const [profileData, incomeQ, incomeA, balanceData, cashFlowQ, grades, ratiosTtm] = await Promise.all([
            profileRes.json().catch(() => null),
            incomeQRes.json().catch(() => null),
            incomeARes.json().catch(() => null),
            balanceRes.json().catch(() => null),
            cashflowRes.json().catch(() => null),
            gradesRes.json().catch(() => null),
            ratiosTtmRes.json().catch(() => null)
        ]);

        const profile = profileData?.[0];

        // 1. 재무 총합 (TTM)
        let ttmRev = 0, ttmOpInc = 0, ttmNetInc = 0, ttmGrossProf = 0;
        if (Array.isArray(incomeQ)) {
            incomeQ.forEach(q => {
                ttmRev += Number(q.revenue) || 0;
                ttmOpInc += Number(q.operatingIncome) || 0;
                ttmNetInc += Number(q.netIncome) || 0;
                ttmGrossProf += Number(q.grossProfit) || 0;
            });
        }

        // 2. Revenue Growth (YoY)
        let revGrowth = null;
        if (Array.isArray(incomeA) && incomeA.length >= 2) {
            const currentRev = Number(incomeA[0].revenue) || 0;
            const prevRev = Number(incomeA[1].revenue) || 0;
            if (prevRev > 0) revGrowth = (currentRev / prevRev) - 1;
        }

        // 3. Margins
        const gMargin = ttmRev > 0 ? ttmGrossProf / ttmRev : null;
        const oMargin = ttmRev > 0 ? ttmOpInc / ttmRev : null;
        const nMargin = ttmRev > 0 ? ttmNetInc / ttmRev : null;

        // 4. EPS & CAGR
        const ttmEps = Array.isArray(incomeQ) ? incomeQ.reduce((s, q) => s + (Number(getEps(q)) || 0), 0) : 0;

        // Latest quarter data (for freshness display)
        const latestQ = Array.isArray(incomeQ) && incomeQ.length > 0 ? incomeQ[0] : null;
        const latestQEps = latestQ ? Number(getEps(latestQ)) || 0 : null;
        const latestQDate = latestQ?.date || null;
        const latestQPeriod = latestQ?.period || null;

        let cagr3Y = null;
        if (Array.isArray(incomeA) && incomeA.length >= 4) {
            const curEps = getEps(incomeA[0]);
            const oldEps = getEps(incomeA[3]);
            if (curEps > 0 && oldEps > 0) cagr3Y = (Math.pow(curEps / oldEps, 1 / 3) - 1) * 100;
        }

        // 5. Upgrades & Momentum
        let upgrades = 0;
        if (Array.isArray(grades)) {
            const cutOff = new Date();
            cutOff.setMonth(cutOff.getMonth() - 6);
            upgrades = grades.filter((g: any) => new Date(g.date) >= cutOff && g.action?.toLowerCase() === 'upgrade').length;
        }

        // 6. Cash Runway
        let runway = null;
        if (balanceData?.[0] && incomeQ?.[0]) {
            const cash = (balanceData[0].cashAndCashEquivalents || 0) + (balanceData[0].shortTermInvestments || 0);
            const quarterlyBurn = Math.abs(incomeQ[0].netIncome || 0);
            if (incomeQ[0].netIncome < 0 && quarterlyBurn > 0) {
                runway = cash / quarterlyBurn;
            }
        }

        // 7. Estimations (Growth Plan Fallback)
        let fy1Eps = grades?.[0]?.estimatedEpsAvg ?? null;
        let fy2Eps = grades?.[1]?.estimatedEpsAvg ?? null;
        let growthEst = 0;

        if (fy1Eps === null || fy2Eps === null) {
            // Analyst Estimates가 없는 경우 (Growth Plan), 과거 4년 데이터 기반 CAGR 계산
            if (Array.isArray(incomeA) && incomeA.length >= 4) {
                const cur = Number(getEps(incomeA[0])) || 0;
                const old = Number(getEps(incomeA[3])) || 0;
                if (cur > 0 && old > 0) {
                    const cagr = Math.pow(cur / old, 1 / 3) - 1;
                    growthEst = Math.max(0, cagr * 100);
                }
            } else if (cagr3Y !== null) {
                growthEst = Math.max(0, cagr3Y);
            }

            // Fallback 추정치
            fy1Eps = ttmEps * (1 + growthEst / 100);
            fy2Eps = fy1Eps * (1 + growthEst / 100);
        } else {
            // Estimates 데이터가 있는 경우 성장률 역산
            if (ttmEps > 0) growthEst = (fy1Eps / ttmEps - 1) * 100;
        }

        const ntmEps = ttmEps * (1 + growthEst / 100);
        const price = quote.price || 0;
        const ttmPe = ttmEps > 0 ? price / ttmEps : null;
        const forwardPe = ntmEps > 0 ? price / ntmEps : null;
        const gapRatio = ttmEps > 0 ? ntmEps / ttmEps : null;

        // PEG: Prefer FMP's pre-calculated value from ratios-ttm, fallback to our manual calculation
        const fmpPeg = ratiosTtm?.[0]?.pegRatioTTM;
        const manualPeg = (ttmPe && growthEst > 0) ? ttmPe / growthEst : null;
        const peg = (fmpPeg && fmpPeg > 0 && fmpPeg < 50) ? fmpPeg : manualPeg; // Use FMP if valid

        // 8. Scoring (calculate individual scores for UI display)
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

        // 9. Revenue CAGR (3-5Y)
        let revCagr3Y = null;
        if (Array.isArray(incomeA) && incomeA.length >= 4) {
            const curRev = Number(incomeA[0].revenue) || 0;
            const oldRev = Number(incomeA[3].revenue) || 0;
            if (curRev > 0 && oldRev > 0) {
                revCagr3Y = (Math.pow(curRev / oldRev, 1 / 3) - 1) * 100;
            }
        }

        const mktCap = quote.marketCap || profile?.mktCap || 0;
        const totalCash = (balanceData?.[0]?.cashAndCashEquivalents || 0) + (balanceData?.[0]?.shortTermInvestments || 0);
        const totalDebt = (balanceData?.[0]?.totalDebt || 0);
        const ev = mktCap + totalDebt - totalCash;

        const evRevenue = ttmRev > 0 ? ev / ttmRev : null;
        const psr = ttmRev > 0 ? mktCap / ttmRev : null;

        // Operating Cash Flow (from Flow statement)
        const ttmOcf = cashFlowQ?.[0]?.operatingCashFlow || 0;

        // 10. GRIP & T-GRIP Scores
        const gripScore = Math.round((pegScore + gapScore) * 10) / 10;
        const tGripScore = calculateTGripScore(ttmEps, ntmEps, runway, revGrowth);

        // --- Data Integrity Check (Sanity Check) & Ghost Ticker Prevention ---
        // 1. Missing Basic Market Data (Ghost Ticker Check)
        if (price <= 0 || mktCap <= 0 || ttmRev <= 0) {
            console.warn(`[SANITY CHECK] Skipping ${symbol}: Missing critical data (Price: ${price}, MC: ${mktCap}, Rev: ${ttmRev})`);
            return null;
        }

        // 2. Critical Error: EPS > Price (Data corruption or unit error in API)
        if (ttmEps > price && price > 0) {
            console.warn(`[SANITY CHECK] Skipping ${symbol}: TTM EPS ($${ttmEps.toFixed(2)}) is higher than Price ($${price.toFixed(2)})`);
            return null;
        }

        // 3. Extreme Growth Outlier (Stale/Split Adjusted data mismatch)
        if (ttmEps > 0.5 && ntmEps > ttmEps * 5) {
            console.warn(`[SANITY CHECK] Skipping ${symbol}: Suspicious growth ($${ntmEps.toFixed(2)} vs $${ttmEps.toFixed(2)}) - Possible stale data`);
            return null;
        }

        // 4. Impossible P/E Ratio (< 0.5x)
        if (ttmEps > 0 && price > 0) {
            const pe = price / ttmEps;
            if (pe < 0.5) {
                console.warn(`[SANITY CHECK] Skipping ${symbol}: Impossible P/E ratio (${pe.toFixed(2)}x)`);
                return null;
            }
        }

        // 5. Net Income > Revenue (Mathematically impossible)
        if (ttmRev > 0 && Math.abs(ttmNetInc) > ttmRev * 1.5) {
            if (ttmNetInc > ttmRev * 10) {
                console.warn(`[SANITY CHECK] Skipping ${symbol}: Net Income ($${ttmNetInc}) is 10x Revenue ($${ttmRev})`);
                return null;
            }
        }

        // 6. Net Income > Market Cap (Extremely suspicious)
        if (mktCap > 0 && ttmNetInc > mktCap * 2) {
            console.warn(`[SANITY CHECK] Skipping ${symbol}: Net Income ($${ttmNetInc}) > 2x Market Cap ($${mktCap})`);
            return null;
        }

        return {
            ticker: symbol,
            symbol,
            name: quote.name || profile?.companyName || symbol,
            sector: profile?.sector || 'Unknown',
            industry: profile?.industry || 'Unknown',
            exchange: quote.exchange || profile?.exchangeShortName || 'Unknown',
            price,
            marketCap: mktCap,
            beta: profile?.beta || null,
            revenue: ttmRev,
            revenueGrowthYoY: revGrowth,
            operatingIncome: ttmOpInc,
            netIncome: ttmNetInc,
            grossMargin: gMargin,
            operatingMargin: oMargin,
            netMargin: nMargin,
            ttmEps,
            fy1Eps: Number(getEps(incomeA?.[0] || {})),
            fy2Eps: Number(getEps(incomeA?.[1] || {})),
            ntmEps,
            ttmPe,
            forwardPe,
            fy2Pe: null,
            gapRatio,
            deltaPe: null,
            epsGrowthRate: growthEst,
            forwardEpsGrowth: null,
            peg,
            forwardPeg: null,
            pegScore,
            gapScore,
            gripScore,
            gripStatus: (ttmEps > 0 && ntmEps > 0) ? 'high' : 'watch' as GripStatus,
            isQualityGrowth: upgrades > 0,
            epsWarnings: upgrades > 0 ? [`최근 6개월 Upgrade ${upgrades}회`] : [],
            turnaroundDelta: ntmEps - ttmEps,
            tGripScore,
            evRevenue,
            psr,
            ruleOf40: (revGrowth !== null && gMargin !== null) ? (revGrowth * 100 + gMargin * 100) : null,
            freeCashFlow: ttmOcf,
            cashAndShortTermInvestments: totalCash,
            cashRunwayQuarters: runway,
            cagr3Y: revCagr3Y, // User asked for Revenue CAGR
            fiscalYearEndMonth: 12,
            lastUpdated: new Date().toISOString(),
            isQuality: ttmEps > 0 && ntmEps > 0,
            isTurnaround: ttmEps <= 0 && ntmEps > 0,
            isEligible: ttmEps > 0 && ntmEps > 0,
            warnings: upgrades > 0 ? [`최근 6개월 Upgrade ${upgrades}회`] : [],
            latestQEps,
            latestQDate,
            latestQPeriod
        };
    } catch (e) {
        console.error(`Error analyzing ${symbol}:`, e);
        return null;
    }
}
