import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface FMPQuote {
    symbol: string;
    name: string;
    price: number;
    changesPercentage: number;
    change: number;
    dayLow: number;
    dayHigh: number;
    yearHigh: number;
    yearLow: number;
    marketCap: number;
    priceAvg50: number;
    priceAvg200: number;
    exchange: string;
    volume: number;
    avgVolume: number;
    eps: number;
    pe: number;
    sharesOutstanding: number;
}

interface FMPEstimate {
    symbol: string;
    date: string;
    estimatedRevenueLow: number;
    estimatedRevenueHigh: number;
    estimatedRevenueAvg: number;
    estimatedEpsAvg: number;
    estimatedEpsHigh: number;
    estimatedEpsLow: number;
    numberAnalystEstimatedRevenue: number;
    numberAnalystsEstimatedEps: number;
}

interface FMPProfile {
    symbol: string;
    companyName: string;
    exchange: string;
    exchangeShortName: string;
    industry: string;
    sector: string;
    country: string;
    mktCap: number;
    isEtf: boolean;
    isFund: boolean;
    isActivelyTrading: boolean;
}

interface AnalysisResult {
    ticker: string;
    name: string;
    sector: string;
    exchange: string;
    price: number;
    marketCap: number;

    // EPS 데이터
    ttmEps: number;
    fy1Eps: number | null;
    fy2Eps: number | null;
    ntmEps: number | null;

    // P/E 관련
    ttmPe: number | null;
    forwardPe: number | null;
    fy2Pe: number | null;

    // GRIP 지표
    gapRatio: number | null;
    epsGrowthRate: number | null;
    peg: number | null;

    // 점수 (전체 유니버스 대비 필요하므로 개별 분석에서는 null)
    pegScore: number | null;
    gapScore: number | null;
    gripScore: number | null;

    // 상태
    isEligible: boolean;
    excludeReason: string | null;
    warnings: string[];

    // 메타
    analystCount: number;
    lastUpdated: string;
}

// NASDAQ 100 벤치마크 기준
const BENCHMARK = {
    avgEpsGrowthRate: 22.7,
    minMarketCap: 300000000, // $300M
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker } = await params;
    const symbol = ticker.toUpperCase();

    if (!FMP_API_KEY) {
        return NextResponse.json({
            success: false,
            error: 'FMP API 키가 설정되지 않았습니다.',
        }, { status: 500 });
    }

    try {
        // 1. Quote 데이터 조회
        const quoteRes = await fetch(
            `${FMP_BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`
        );
        const quoteData: FMPQuote[] = await quoteRes.json();

        if (!quoteData || quoteData.length === 0) {
            return NextResponse.json({
                success: false,
                error: `티커 "${symbol}"를 찾을 수 없습니다.`,
            }, { status: 404 });
        }

        const quote = quoteData[0];

        // AMEX 제외
        if (quote.exchange === 'AMEX') {
            return NextResponse.json({
                success: false,
                error: `"${symbol}"은 AMEX 거래소 종목으로 분석 대상이 아닙니다.`,
            }, { status: 400 });
        }

        // 2. 프로필 조회
        const profileRes = await fetch(
            `${FMP_BASE_URL}/profile/${symbol}?apikey=${FMP_API_KEY}`
        );
        const profileData: FMPProfile[] = await profileRes.json();
        const profile = profileData?.[0];

        // ETF/펀드 제외
        if (profile?.isEtf || profile?.isFund) {
            return NextResponse.json({
                success: false,
                error: `"${symbol}"은 ${profile.isEtf ? 'ETF' : '펀드'}로 분석 대상이 아닙니다.`,
            }, { status: 400 });
        }

        // 3. 애널리스트 추정치 조회
        const estimatesRes = await fetch(
            `${FMP_BASE_URL}/analyst-estimates/${symbol}?apikey=${FMP_API_KEY}&limit=3`
        );
        const estimatesData: FMPEstimate[] = await estimatesRes.json();

        // 분석 결과 계산
        const result = calculateAnalysis(symbol, quote, profile, estimatesData);

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error(`[API/analyze/${symbol}] Error:`, error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.',
        }, { status: 500 });
    }
}

function calculateAnalysis(
    symbol: string,
    quote: FMPQuote,
    profile: FMPProfile | undefined,
    estimates: FMPEstimate[]
): AnalysisResult {
    const warnings: string[] = [];
    let excludeReason: string | null = null;
    let isEligible = true;

    const ttmEps = quote.eps ?? 0;
    const price = quote.price;
    const marketCap = quote.marketCap ?? profile?.mktCap ?? 0;

    // EPS 추정치 파싱
    const sortedEstimates = [...estimates].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const fy1Eps = sortedEstimates[0]?.estimatedEpsAvg ?? null;
    const fy2Eps = sortedEstimates[1]?.estimatedEpsAvg ?? null;
    const analystCount = sortedEstimates[0]?.numberAnalystsEstimatedEps ?? 0;

    // NTM EPS 계산 (가중 평균)
    let ntmEps: number | null = null;
    if (fy1Eps !== null && fy2Eps !== null) {
        const now = new Date();
        const fiscalYearEnd = new Date(sortedEstimates[0]?.date ?? now);
        const monthsRemaining = Math.max(0, Math.min(12,
            (fiscalYearEnd.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)
        ));
        ntmEps = (fy1Eps * monthsRemaining + fy2Eps * (12 - monthsRemaining)) / 12;
    } else if (fy1Eps !== null) {
        ntmEps = fy1Eps;
    }

    // P/E 계산
    const ttmPe = ttmEps > 0 ? price / ttmEps : null;
    const forwardPe = ntmEps && ntmEps > 0 ? price / ntmEps : null;
    const fy2Pe = fy2Eps && fy2Eps > 0 ? price / fy2Eps : null;

    // Gap Ratio
    const gapRatio = ttmEps > 0 && ntmEps !== null ? ntmEps / ttmEps : null;

    // EPS 성장률
    const epsGrowthRate = ttmEps > 0 && ntmEps !== null
        ? ((ntmEps - ttmEps) / ttmEps) * 100
        : null;

    // PEG
    const peg = ttmPe !== null && epsGrowthRate !== null && epsGrowthRate > 0
        ? ttmPe / epsGrowthRate
        : null;

    // 제외 사유 체크
    if (ttmEps <= 0) {
        if (ntmEps !== null && ntmEps > 0) {
            warnings.push('High-Beta 종목 (TTM 적자 → NTM 흑자 전환 예상)');
        } else {
            excludeReason = 'TTM EPS ≤ 0 (적자 기업)';
            isEligible = false;
        }
    } else if (ntmEps === null || ntmEps <= 0) {
        excludeReason = 'NTM EPS ≤ 0 또는 추정치 없음';
        isEligible = false;
    } else if (forwardPe !== null && forwardPe > 300) {
        excludeReason = 'Forward P/E > 300 (과대평가)';
        isEligible = false;
    } else if (forwardPe !== null && forwardPe < 1) {
        excludeReason = 'Forward P/E < 1 (데이터 오류 가능성)';
        isEligible = false;
    } else if (epsGrowthRate !== null && epsGrowthRate < BENCHMARK.avgEpsGrowthRate) {
        warnings.push(`EPS 성장률 ${epsGrowthRate.toFixed(1)}% < 나스닥 100 평균 ${BENCHMARK.avgEpsGrowthRate}%`);
    }

    if (marketCap < BENCHMARK.minMarketCap) {
        warnings.push(`시총 $${(marketCap / 1e6).toFixed(0)}M < $300M (소형주)`);
    }

    if (analystCount < 3) {
        warnings.push(`애널리스트 커버리지 ${analystCount}명 (낮음)`);
    }

    // FY1→FY2 연속성 체크
    if (fy1Eps !== null && fy2Eps !== null && fy2Eps < fy1Eps) {
        warnings.push('FY2 EPS < FY1 EPS (성장 둔화 예상)');
    }

    return {
        ticker: symbol,
        name: quote.name ?? profile?.companyName ?? symbol,
        sector: profile?.sector ?? 'Unknown',
        exchange: quote.exchange ?? profile?.exchangeShortName ?? 'Unknown',
        price,
        marketCap,
        ttmEps,
        fy1Eps,
        fy2Eps,
        ntmEps,
        ttmPe,
        forwardPe,
        fy2Pe,
        gapRatio,
        epsGrowthRate,
        peg,
        // 개별 분석에서는 전체 유니버스 대비 점수 계산 불가
        pegScore: null,
        gapScore: null,
        gripScore: null,
        isEligible,
        excludeReason,
        warnings,
        analystCount,
        lastUpdated: new Date().toISOString(),
    };
}
