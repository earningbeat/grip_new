import { NextResponse } from 'next/server';
import config from '@/config.json';
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
    industry: string;
    beta: number;
    price: number;
    lastAnnualDividend: number;
    volume: number;
    exchange: string;
    exchangeShortName: string;
    country: string;
    isEtf: boolean;
    isFund: boolean;
    isActivelyTrading: boolean;
}

interface FMPQuote {
    symbol: string;
    name: string;
    price: number;
    eps: number;
    pe: number;
    marketCap: number;
    exchange: string;
}

interface FMPEstimate {
    symbol: string;
    date: string;
    estimatedEpsAvg: number;
    numberAnalystsEstimatedEps: number;
}

/**
 * 랭킹 데이터 조회 API (FMP Stock Screener + Estimates)
 */
export async function GET() {
    try {
        if (!FMP_API_KEY) {
            throw new Error('FMP_API_KEY not configured');
        }

        console.log('[API/ranking] Fetching live data from FMP...');

        // 1. Stock Screener로 NYSE/NASDAQ 종목 조회 (시총 $300M 이상)
        const screenerUrl = `${FMP_BASE_URL}/stock-screener?` + new URLSearchParams({
            exchange: 'NYSE,NASDAQ',
            marketCapMoreThan: '300000000',
            isEtf: 'false',
            isFund: 'false',
            isActivelyTrading: 'true',
            limit: '500',
            apikey: FMP_API_KEY
        });

        const screenerRes = await fetch(screenerUrl);
        const screenerData: FMPScreenerStock[] = await screenerRes.json();

        if (!Array.isArray(screenerData) || screenerData.length === 0) {
            throw new Error('No stocks returned from screener');
        }

        console.log(`[API/ranking] Screener returned ${screenerData.length} stocks`);

        // 2. 상위 100개만 상세 분석 (API 호출 제한)
        const topStocks = screenerData.slice(0, 100);
        const symbols = topStocks.map(s => s.symbol);

        // 3. Quote 데이터 일괄 조회
        const quotesUrl = `${FMP_BASE_URL}/quote/${symbols.join(',')}?apikey=${FMP_API_KEY}`;
        const quotesRes = await fetch(quotesUrl);
        const quotesData: FMPQuote[] = await quotesRes.json();
        const quotesMap = new Map(quotesData.map(q => [q.symbol, q]));

        // 4. 애널리스트 추정치 조회 (병렬)
        const estimatesPromises = symbols.slice(0, 50).map(async (symbol) => {
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

        // 5. GRIP 지표 계산
        const processedStocks: StockData[] = [];
        let excluded = 0;

        for (const stock of topStocks.slice(0, 50)) {
            const quote = quotesMap.get(stock.symbol);
            const estimates = estimatesMap.get(stock.symbol) || [];

            if (!quote) continue;

            const ttmEps = quote.eps ?? 0;
            const price = quote.price ?? stock.price;
            const marketCap = quote.marketCap ?? stock.marketCap;

            // EPS 추정치 파싱
            const sortedEstimates = [...estimates].sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const fy1Eps = sortedEstimates[0]?.estimatedEpsAvg ?? null;
            const fy2Eps = sortedEstimates[1]?.estimatedEpsAvg ?? null;

            // NTM EPS 계산
            let ntmEps: number | null = null;
            if (fy1Eps !== null && fy2Eps !== null) {
                ntmEps = (fy1Eps + fy2Eps) / 2; // 간단히 평균
            } else if (fy1Eps !== null) {
                ntmEps = fy1Eps;
            }

            // 필터링
            if (ttmEps <= 0 || ntmEps === null || ntmEps <= 0) {
                excluded++;
                continue;
            }

            // P/E 계산
            const ttmPe = ttmEps > 0 ? price / ttmEps : null;
            const forwardPe = ntmEps > 0 ? price / ntmEps : null;
            const fy2Pe = fy2Eps && fy2Eps > 0 ? price / fy2Eps : null;

            // Gap Ratio
            const gapRatio = ntmEps / ttmEps;

            // EPS Growth Rate
            const epsGrowthRate = ((ntmEps - ttmEps) / ttmEps) * 100;

            // PEG
            const peg = ttmPe && epsGrowthRate > 0 ? ttmPe / epsGrowthRate : null;

            // 벤치마크 필터 (성장률 22.7% 이상)
            if (epsGrowthRate < 22.7) {
                excluded++;
                continue;
            }

            // Forward P/E 필터
            if (forwardPe && (forwardPe > 300 || forwardPe < 1)) {
                excluded++;
                continue;
            }

            processedStocks.push({
                ticker: stock.symbol,
                name: stock.companyName,
                sector: stock.sector || 'Unknown',
                price,
                marketCap,
                ttmEps,
                fy1Eps: fy1Eps ?? 0,
                fy2Eps: fy2Eps ?? 0,
                ntmEps,
                ttmPe,
                forwardPe,
                fy2Pe,
                gapRatio,
                deltaPe: ttmPe && forwardPe ? ttmPe - forwardPe : null,
                epsGrowthRate,
                forwardEpsGrowth: fy1Eps && fy2Eps && fy1Eps > 0 ? ((fy2Eps - fy1Eps) / fy1Eps) * 100 : null,
                peg,
                forwardPeg: null,
                pegScore: null,  // 전체 대비 점수 (TODO)
                gapScore: null,
                gripScore: null,
                gripStatus: gapRatio > 1.5 && peg && peg < 1.5 ? 'high' : gapRatio > 1.3 ? 'potential' : 'watch',
                isQualityGrowth: true,
                epsWarnings: [],
                turnaroundDelta: null,
                turnaroundScore: null,
                fiscalYearEndMonth: 12,
                lastUpdated: new Date().toISOString()
            });
        }

        // GRIP Score 정렬 (Gap Ratio 기준 임시)
        const sortedData = processedStocks.sort((a, b) =>
            (b.gapRatio ?? 0) - (a.gapRatio ?? 0)
        ).slice(0, 10);

        console.log(`[API/ranking] Processed ${processedStocks.length} eligible stocks, excluded ${excluded}`);

        return NextResponse.json({
            success: true,
            data: sortedData,
            metadata: {
                totalProcessed: topStocks.length,
                totalExcluded: excluded,
                excludedReasons: {},
                timestamp: new Date().toISOString(),
                processingTimeMs: 0,
                isDemo: false
            }
        });

    } catch (error) {
        console.error('[API/ranking] Error:', error);

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
