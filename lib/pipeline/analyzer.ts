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
        const [quoteRes, profileRes, incomeQRes, incomeARes, balanceRes, gradesRes] = await Promise.all([
            fetch(`${baseUrl}/quote?symbol=${symbol}&apikey=${apiKey}`),
            fetch(`${baseUrl}/profile?symbol=${symbol}&apikey=${apiKey}`),
            fetch(`${baseUrl}/income-statement?symbol=${symbol}&period=quarter&limit=4&apikey=${apiKey}`),
            fetch(`${baseUrl}/income-statement?symbol=${symbol}&period=annual&limit=4&apikey=${apiKey}`),
            fetch(`${baseUrl}/balance-sheet-statement?symbol=${symbol}&period=quarter&limit=1&apikey=${apiKey}`),
            fetch(`${baseUrl}/grades?symbol=${symbol}&limit=20&apikey=${apiKey}`)
        ]);

        const [quoteData, profileData, incomeQ, incomeA, balanceData, grades] = await Promise.all([
            quoteRes.json().catch(() => null),
            profileRes.json().catch(() => null),
            incomeQRes.json().catch(() => null),
            incomeARes.json().catch(() => null),
            balanceRes.json().catch(() => null),
            gradesRes.json().catch(() => null)
        ]);

        const quote = quoteData?.[0];
        const profile = profileData?.[0];
        if (!quote) return null;

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

        // 7. Estimations
        const growthEst = cagr3Y !== null ? Math.max(0, cagr3Y) : 0;
        const ntmEps = ttmEps * (1 + growthEst / 100);
        const price = quote.price || 0;
        const ttmPe = ttmEps > 0 ? price / ttmEps : null;
        const forwardPe = ntmEps > 0 ? price / ntmEps : null;
        const gapRatio = ttmEps > 0 ? ntmEps / ttmEps : null;
        const peg = (ttmPe && growthEst > 0) ? ttmPe / growthEst : null;

        // 8. Scoring (단순화: PEG + GAP만)
        const gripScore = calculateGripScore({ peg, gapRatio });
        const tGripScore = calculateTGripScore(ttmEps, ntmEps, runway, revGrowth);

        return {
            ticker: symbol,
            symbol,
            name: quote.name || profile?.companyName || symbol,
            sector: profile?.sector || 'Unknown',
            industry: profile?.industry || 'Unknown',
            exchange: quote.exchange || profile?.exchangeShortName || 'Unknown',
            price,
            marketCap: quote.marketCap || profile?.mktCap || 0,
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
            fy2Pe: null, // 계산 생략
            gapRatio,
            deltaPe: null,
            epsGrowthRate: growthEst,
            forwardEpsGrowth: null,
            peg,
            forwardPeg: null,
            pegScore: null, // scoring.ts에서 점수화 필요 시 확장
            gapScore: null,
            gripScore,
            gripStatus: (ttmEps > 0 && ntmEps > 0) ? 'high' : 'watch' as GripStatus,
            isQualityGrowth: upgrades > 0,
            epsWarnings: upgrades > 0 ? [`최근 6개월 Upgrade ${upgrades}회`] : [],
            turnaroundDelta: ntmEps - ttmEps,
            turnaroundScore: null,
            tGripScore,
            cashRunwayQuarters: runway,
            fiscalYearEndMonth: 12,
            lastUpdated: new Date().toISOString(),
            isQuality: ttmEps > 0 && ntmEps > 0,
            isTurnaround: ttmEps <= 0 && ntmEps > 0,
            isEligible: ttmEps > 0 && ntmEps > 0,
            warnings: upgrades > 0 ? [`최근 6개월 Upgrade ${upgrades}회`] : []
        };
    } catch (e) {
        console.error(`Error analyzing ${symbol}:`, e);
        return null;
    }
}
