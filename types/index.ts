/**
 * GRIP Tracker 타입 정의
 * 
 * GRIP = Growth Re-rating Inflection Point
 * 정규분포 기반 점수화 체계 적용
 */

export interface StockData {
    ticker: string;
    symbol: string;
    name: string;
    sector: string;
    price: number;
    marketCap: number;

    // EPS 데이터
    ttmEps: number;
    fy1Eps: number;
    fy2Eps: number;
    ntmEps: number | null;

    // P/E 관련 (참고용)
    ttmPe: number | null;
    forwardPe: number | null;           // Price / NTM EPS
    fy2Pe: number | null;               // Price / FY2 EPS

    // Gap Ratio
    gapRatio: number | null;            // NTM EPS / TTM EPS
    deltaPe: number | null;

    // GRIP 지표 (기존 - 호환성 유지)
    epsGrowthRate: number | null;       // (NTM EPS - TTM EPS) / TTM EPS * 100
    forwardEpsGrowth: number | null;    // (FY2 EPS - FY1 EPS) / FY1 EPS * 100
    peg: number | null;                 // TTM P/E / EPS Growth Rate
    forwardPeg: number | null;          // Forward P/E / Forward EPS Growth

    // 검색 UI용 재무 데이터
    revenue?: number;
    revenueGrowthYoY?: number | null;
    operatingIncome?: number;
    netIncome?: number;
    grossMargin?: number | null;
    operatingMargin?: number | null;
    netMargin?: number | null;

    // 점수 체계
    pegScore: number | null;
    gapScore: number | null;
    gripScore: number | null;
    gripStatus: GripStatus;

    // EPS 품질 체크
    isQualityGrowth: boolean;
    epsWarnings: string[];

    // 레거시 UI 호환 필드
    isEligible?: boolean;
    isQuality?: boolean;
    warnings?: string[];
    exchange: string;

    // High-Beta / 턴어라운드 지표
    isTurnaround: boolean;
    turnaroundDelta: number | null;
    absoluteGapRatio?: number | null;         // New: (|TTM EPS| + NTM EPS)
    tGripScore: number | null;                // 신규 T-GRIP

    // 추가 턴어라운드 상세 지표
    evRevenue?: number | null;
    psr?: number | null;                      // Price / Sales Ratio
    ruleOf40?: number | null;
    freeCashFlow?: number | null;             // TTM Operating Cash Flow
    cashAndShortTermInvestments?: number | null;

    // Cash & Runway
    cashRunwayQuarters: number | null;

    // 추가 메타 (CAGR, Upgrades)
    cagr3Y: number | null;
    upgradeCount6M?: number;
    beta?: number | null;
    industry?: string;

    // Latest quarter data (freshness)
    latestQEps?: number | null;
    latestQDate?: string | null;
    latestQPeriod?: string | null;

    // 메타
    fiscalYearEndMonth: number;
    lastUpdated: string;
}

export interface RankingMetadata {
    totalProcessed: number;
    totalExcluded: number;
    benchmarkGrowth?: number;
    benchmarkPe?: number;
    timestamp: string;
}

export interface RankingResponse {
    success: boolean;
    data: StockData[];
    metadata?: RankingMetadata;
    error?: string;
}

// GRIP 상태 정의
export type GripStatus = 'high' | 'potential' | 'watch' | 'turnaround' | null;

// GRIP 점수 등급
export function getGripGrade(gripScore: number | null): string {
    if (gripScore === null) return '-';
    if (gripScore >= 18) return 'S';    // 상위 10%
    if (gripScore >= 16) return 'A';    // 상위 20%
    if (gripScore >= 14) return 'B';    // 상위 40%
    if (gripScore >= 12) return 'C';    // 평균
    if (gripScore >= 10) return 'D';    // 하위 40%
    return 'F';                          // 하위 20%
}
