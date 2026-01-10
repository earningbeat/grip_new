import {
    getSP500Constituents,
    getQuotes,
    getIncomeStatements,
    getAnalystEstimates,
    getCompanyProfiles,
    calculateAllMetrics,
    calculateMonthsRemaining,
    applyAllFilters,
    getTopN
} from '@/lib';
import type { StockData, Quote, AnalystEstimate, IncomeStatement, CompanyProfile } from '@/lib';
import config from '@/config.json';

interface ProcessingResult {
    data: StockData[];
    metadata: {
        totalProcessed: number;
        totalExcluded: number;
        excludedReasons: Record<string, number>;
        timestamp: string;
        processingTimeMs: number;
    };
}

interface RawStockData {
    ticker: string;
    quote: Quote | null;
    incomeStatements: IncomeStatement[];
    estimates: AnalystEstimate[];
    profile: CompanyProfile | null;
}

/**
 * FY1, FY2 추정치 추출
 * 현재 연도와 다음 연도의 추정치를 반환
 */
function extractFyEstimates(
    estimates: AnalystEstimate[],
    currentYear: number
): { fy1Eps: number | null; fy2Eps: number | null } {
    // date 필드에서 연도 추출 후 매칭
    const fy1 = estimates.find(e => {
        const year = new Date(e.date).getFullYear();
        return year === currentYear || year === currentYear + 1;
    });

    const fy2 = estimates.find(e => {
        const year = new Date(e.date).getFullYear();
        return year === currentYear + 1 || year === currentYear + 2;
    });

    // 추정치가 순서대로 정렬되어 있다고 가정
    const sortedEstimates = [...estimates].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const futureEstimates = sortedEstimates.filter(
        e => new Date(e.date).getFullYear() >= currentYear
    );

    return {
        fy1Eps: futureEstimates[0]?.estimatedEpsAvg ?? null,
        fy2Eps: futureEstimates[1]?.estimatedEpsAvg ?? null
    };
}

/**
 * TTM EPS 추출 (최근 4분기 합산)
 */
function extractTtmEps(incomeStatements: IncomeStatement[]): number | null {
    if (incomeStatements.length === 0) return null;

    // 분기별 데이터가 있는 경우 최근 4분기 합산
    const quarterlyStatements = incomeStatements.filter(s => s.period === 'Q1' || s.period === 'Q2' || s.period === 'Q3' || s.period === 'Q4');

    if (quarterlyStatements.length >= 4) {
        const recent4 = quarterlyStatements.slice(0, 4);
        return recent4.reduce((sum, s) => sum + (s.epsdiluted || s.eps), 0);
    }

    // 연간 데이터만 있는 경우 최근 연간 EPS 사용
    const annualStatements = incomeStatements.filter(s => s.period === 'FY');
    if (annualStatements.length > 0) {
        return annualStatements[0].epsdiluted || annualStatements[0].eps;
    }

    // 기본: 첫 번째 데이터의 EPS
    return incomeStatements[0].epsdiluted || incomeStatements[0].eps;
}

/**
 * 개별 종목 원시 데이터 → StockData 변환
 */
function transformToStockData(raw: RawStockData): StockData | null {
    const { ticker, quote, incomeStatements, estimates, profile } = raw;

    if (!quote || quote.price <= 0) return null;

    const ttmEps = extractTtmEps(incomeStatements);
    if (ttmEps === null) return null;

    const currentYear = new Date().getFullYear();
    let { fy1Eps, fy2Eps } = extractFyEstimates(estimates, currentYear);

    // [Growth Plan Fallback] Estimate가 없거나 비어있는 경우 CAGR 기반으로 NTM EPS 계산
    let epsGrowthRate = 0;
    if (fy1Eps === null || fy2Eps === null) {
        // 최근 4개 연도 연간 데이터 기준 CAGR 계산 시도
        const annuals = incomeStatements.filter(s => s.period === 'FY');
        if (annuals.length >= 4) {
            const cur = annuals[0].epsdiluted || annuals[0].eps;
            const old = annuals[3].epsdiluted || annuals[3].eps;
            if (cur > 0 && old > 0) {
                const cagr = Math.pow(cur / old, 1 / 3) - 1;
                epsGrowthRate = Math.max(0, cagr * 100);
            }
        }

        // Fallback 추정치 (FY1 = TTM * (1+g), FY2 = FY1 * (1+g))
        fy1Eps = ttmEps * (1 + epsGrowthRate / 100);
        fy2Eps = fy1Eps * (1 + epsGrowthRate / 100);
    }

    // 회계연도 종료월 추정 (기본 12월)
    const fiscalYearEndMonth = 12;
    const monthsRemaining = calculateMonthsRemaining(fiscalYearEndMonth);

    const metrics = calculateAllMetrics(
        quote.price,
        ttmEps,
        fy1Eps,
        fy2Eps,
        monthsRemaining
    );

    return {
        ticker,
        name: profile?.companyName ?? quote.name ?? ticker,
        sector: profile?.sector ?? 'Unknown',
        price: quote.price,
        marketCap: profile?.mktCap ?? quote.marketCap ?? 0,
        ttmEps,
        fy1Eps,
        fy2Eps,
        ntmEps: metrics.ntmEps,
        ttmPe: metrics.ttmPe,
        forwardPe: metrics.forwardPe,
        fy2Pe: metrics.fy2Pe,
        gapRatio: metrics.gapRatio,
        deltaPe: metrics.deltaPe,
        // GRIP 관련 필드
        epsGrowthRate: metrics.epsGrowthRate,
        forwardEpsGrowth: metrics.forwardEpsGrowth,
        peg: metrics.peg,
        forwardPeg: metrics.forwardPeg,
        // 새 정규분포 기반 점수 (파이프라인에서 별도 계산)
        pegScore: null,
        gapScore: null,
        gripScore: null,
        gripStatus: metrics.gripStatus,
        // EPS 품질 체크 (파이프라인에서 별도 계산)
        isQualityGrowth: true,
        epsWarnings: [],
        // GRIP-TS 관련 필드
        turnaroundDelta: metrics.turnaroundRatio,  // 기존 metrics 재사용
        turnaroundScore: null,
        fiscalYearEndMonth,
        lastUpdated: new Date().toISOString()
    };
}

/**
 * 전체 파이프라인 실행
 */
export async function runPipeline(): Promise<ProcessingResult> {
    const startTime = Date.now();

    // 1. 유니버스 로드
    const constituents = await getSP500Constituents();
    const symbols = constituents.map(c => c.symbol);

    console.log(`[Pipeline] Loaded ${symbols.length} symbols from S&P 500`);

    // 2. 프로필 일괄 조회
    const profiles = await getCompanyProfiles(symbols);
    const profileMap = new Map(profiles.map(p => [p.symbol, p]));

    // 3. 시세 일괄 조회 (배치 처리)
    const batchSize = 50;
    const allQuotes: Quote[] = [];

    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const quotes = await getQuotes(batch);
        allQuotes.push(...quotes);

        // Rate limiting
        if (i + batchSize < symbols.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    const quoteMap = new Map(allQuotes.map(q => [q.symbol, q]));

    // 4. 개별 종목 상세 데이터 수집 + 변환 (병렬 처리)
    const rawDataPromises = symbols.map(async (symbol): Promise<RawStockData> => {
        try {
            const [incomeStatements, estimates] = await Promise.all([
                getIncomeStatements(symbol, 8),
                getAnalystEstimates(symbol, 5)
            ]);

            return {
                ticker: symbol,
                quote: quoteMap.get(symbol) ?? null,
                incomeStatements,
                estimates,
                profile: profileMap.get(symbol) ?? null
            };
        } catch (error) {
            console.error(`[Pipeline] Error fetching ${symbol}:`, error);
            return {
                ticker: symbol,
                quote: quoteMap.get(symbol) ?? null,
                incomeStatements: [],
                estimates: [],
                profile: profileMap.get(symbol) ?? null
            };
        }
    });

    // Batch parallel execution (Strict Rate Limiting for Growth Plan: 1 RPS)
    const concurrencyLimit = 1;
    const rawDataResults: RawStockData[] = [];

    for (let i = 0; i < rawDataPromises.length; i += concurrencyLimit) {
        const batch = rawDataPromises.slice(i, i + concurrencyLimit);
        const results = await Promise.all(batch);
        rawDataResults.push(...results);

        // Progress log every 10 stocks
        if (i % 10 === 0) {
            console.log(`[Pipeline] Processed ${i}/${symbols.length} tickers...`);
        }
    }

    // 5. 변환
    const transformedData: StockData[] = [];
    for (const raw of rawDataResults) {
        const stock = transformToStockData(raw);
        if (stock) {
            transformedData.push(stock);
        }
    }

    console.log(`[Pipeline] Transformed ${transformedData.length}/${symbols.length} stocks`);

    // 6. 필터 적용
    const filterResult = applyAllFilters(transformedData);

    // 제외 사유 집계
    const excludedReasons: Record<string, number> = {};
    for (const { reason } of filterResult.excluded) {
        excludedReasons[reason] = (excludedReasons[reason] ?? 0) + 1;
    }

    // 7. 상위 N개 추출
    const topStocks = getTopN(filterResult.passed);

    const processingTimeMs = Date.now() - startTime;

    console.log(`[Pipeline] Completed in ${processingTimeMs}ms`);
    console.log(`[Pipeline] Top ${topStocks.length} stocks by Gap Ratio`);

    return {
        data: topStocks,
        metadata: {
            totalProcessed: symbols.length,
            totalExcluded: filterResult.excluded.length + (symbols.length - transformedData.length),
            excludedReasons,
            timestamp: new Date().toISOString(),
            processingTimeMs
        }
    };
}

export type { ProcessingResult };
