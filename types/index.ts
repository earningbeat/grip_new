/**
 * GRIP Tracker 타입 정의
 * 
 * GRIP = Growth Re-rating Inflection Point
 * 정규분포 기반 점수화 체계 적용
 */

export interface StockData {
    ticker: string;
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

    // 새 GRIP 점수 체계 (정규분포 기반)
    pegScore: number | null;            // PEG 기반 점수 (1-10, 낮을수록 높은 점수)
    gapScore: number | null;            // Gap Ratio 기반 점수 (1-10, 높을수록 높은 점수)
    gripScore: number | null;           // pegScore + gapScore (2-20)
    gripStatus: GripStatus;

    // EPS 품질 체크
    isQualityGrowth: boolean;           // 일시적 EPS 급증 아님
    epsWarnings: string[];              // EPS 품질 경고 메시지

    // High-Beta 전용 (GRIP-TS)
    turnaroundDelta: number | null;     // NTM EPS - TTM EPS (변화량)
    turnaroundScore: number | null;     // 턴어라운드 점수 (1-10)

    // 메타
    fiscalYearEndMonth: number;
    lastUpdated: string;
}

export interface RankingMetadata {
    totalProcessed: number;
    totalExcluded: number;
    excludedReasons: Record<string, number>;
    timestamp: string;
    processingTimeMs: number;
    isDemo?: boolean;

    // 벤치마크 정보
    benchmarkPe?: number;
    benchmarkGrowth?: number;
}

export interface RankingResponse {
    success: boolean;
    data: StockData[];
    metadata?: RankingMetadata;
    error?: string;
}

// GRIP 상태 정의
export type GripStatus = 'high' | 'potential' | 'watch' | null;

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
