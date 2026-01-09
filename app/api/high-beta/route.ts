import { NextResponse } from 'next/server';
import type { StockData } from '@/lib/utils/filters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface FMPScreenerStock {
    symbol: string;
    companyName: string;
    marketCap: number;
    sector: string;
    price: number;
    exchange: string;
}

interface FMPQuote {
    symbol: string;
    name: string;
    price: number;
    eps: number;
    marketCap: number;
}

interface FMPEstimate {
    symbol: string;
    date: string;
    estimatedEpsAvg: number;
    numberAnalystsEstimatedEps: number;
}

/**
 * High-Beta (턴어라운드 후보) 데이터 조회 API
 * TTM EPS ≤ 0이지만 NTM EPS > 0인 종목
 */
export async function GET() {
    try {
        if (!FMP_API_KEY) {
            throw new Error('FMP_API_KEY not configured');
        }

        console.log('[API/high-beta] Fetching turnaround candidates from FMP...');

        // 1. Stock Screener로 NYSE/NASDAQ 종목 조회
        const screenerUrl = `${FMP_BASE_URL}/stock-screener?` + new URLSearchParams({
            exchange: 'NYSE,NASDAQ',
            marketCapMoreThan: '100000000', // $100M 이상 (소형주 포함)
            isEtf: 'false',
            isFund: 'false',
            isActivelyTrading: 'true',
            limit: '200',
            apikey: FMP_API_KEY
        });

        const screenerRes = await fetch(screenerUrl);
        const screenerData: FMPScreenerStock[] = await screenerRes.json();

        if (!Array.isArray(screenerData)) {
            throw new Error('Invalid screener response');
        }

        console.log(`[API/high-beta] Screener returned ${screenerData.length} stocks`);

        // 2. 50개만 상세 분석
        const symbols = screenerData.slice(0, 50).map(s => s.symbol);

        // 3. Quote 데이터 일괄 조회
        const quotesUrl = `${FMP_BASE_URL}/quote/${symbols.join(',')}?apikey=${FMP_API_KEY}`;
        const quotesRes = await fetch(quotesUrl);
        const quotesData: FMPQuote[] = await quotesRes.json();
        const quotesMap = new Map(quotesData.map(q => [q.symbol, q]));

        // 4. 애널리스트 추정치 조회
        const estimatesPromises = symbols.map(async (symbol) => {
            try {
                const res = await fetch(
                    `${FMP_BASE_URL}/analyst-estimates/${symbol}?apikey=${FMP_API_KEY}&limit=2`
                );
                const data: FMPEstimate[] = await res.json();
                return { symbol, estimates: data };
            } catch {
                return { symbol, estimates: [] };
            }
        });

        const estimatesResults = await Promise.all(estimatesPromises);
        const estimatesMap = new Map(estimatesResults.map(e => [e.symbol, e.estimates]));

        // 5. High-Beta 조건 필터링 (TTM EPS ≤ 0, NTM EPS > 0)
        const highBetaStocks: StockData[] = [];

        for (const stock of screenerData.slice(0, 50)) {
            const quote = quotesMap.get(stock.symbol);
            const estimates = estimatesMap.get(stock.symbol) || [];

            if (!quote) continue;

            const ttmEps = quote.eps ?? 0;
            const price = quote.price ?? stock.price;
            const marketCap = quote.marketCap ?? stock.marketCap;

            // TTM EPS가 양수면 High-Beta 대상 아님
            if (ttmEps > 0) continue;

            // EPS 추정치 파싱
            const sortedEstimates = [...estimates].sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const fy1Eps = sortedEstimates[0]?.estimatedEpsAvg ?? null;
            const fy2Eps = sortedEstimates[1]?.estimatedEpsAvg ?? null;

            // NTM EPS 계산
            let ntmEps: number | null = null;
            if (fy1Eps !== null && fy2Eps !== null) {
                ntmEps = (fy1Eps + fy2Eps) / 2;
            } else if (fy1Eps !== null) {
                ntmEps = fy1Eps;
            }

            // NTM EPS가 양수가 아니면 제외
            if (ntmEps === null || ntmEps <= 0) continue;

            // Turnaround Delta 계산
            const turnaroundDelta = ntmEps - ttmEps;

            // P/E 계산
            const forwardPe = ntmEps > 0 ? price / ntmEps : null;
            const fy2Pe = fy2Eps && fy2Eps > 0 ? price / fy2Eps : null;

            highBetaStocks.push({
                ticker: stock.symbol,
                name: stock.companyName,
                sector: stock.sector || 'Unknown',
                price,
                marketCap,
                ttmEps,
                fy1Eps: fy1Eps ?? 0,
                fy2Eps: fy2Eps ?? 0,
                ntmEps,
                ttmPe: null, // TTM EPS가 음수라 계산 불가
                forwardPe,
                fy2Pe,
                gapRatio: null, // TTM EPS가 음수라 계산 불가
                deltaPe: null,
                epsGrowthRate: null,
                forwardEpsGrowth: fy1Eps && fy2Eps && fy1Eps !== 0 ? ((fy2Eps - fy1Eps) / Math.abs(fy1Eps)) * 100 : null,
                peg: null,
                forwardPeg: null,
                pegScore: null,
                gapScore: null,
                gripScore: null,
                gripStatus: null,
                isQualityGrowth: fy1Eps !== null && fy2Eps !== null && fy2Eps > fy1Eps,
                epsWarnings: [],
                turnaroundDelta,
                turnaroundScore: null, // TODO: 전체 대비 점수 계산
                fiscalYearEndMonth: 12,
                lastUpdated: new Date().toISOString()
            });
        }

        // Turnaround Delta 기준 정렬 (큰 순)
        const sortedData = highBetaStocks
            .sort((a, b) => (b.turnaroundDelta ?? 0) - (a.turnaroundDelta ?? 0))
            .slice(0, 10);

        console.log(`[API/high-beta] Found ${highBetaStocks.length} turnaround candidates`);

        return NextResponse.json({
            success: true,
            data: sortedData,
            metadata: {
                totalProcessed: 50,
                totalFound: highBetaStocks.length,
                description: 'TTM EPS ≤ 0 but NTM EPS > 0 (Turnaround Candidates)',
                timestamp: new Date().toISOString(),
                isDemo: false
            }
        });

    } catch (error) {
        console.error('[API/high-beta] Error:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                data: []
            },
            { status: 500 }
        );
    }
}
