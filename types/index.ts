export interface StockData {
    ticker: string;
    name: string;
    sector: string;
    price: number;
    marketCap: number;
    ttmEps: number;
    fy1Eps: number;
    fy2Eps: number;
    ntmEps: number | null;
    ttmPe: number | null;
    forwardPe: number | null;           // Price / NTM EPS (Rolling 12개월)
    fy2Pe: number | null;               // Price / FY2 EPS (고정 회계연도)
    gapRatio: number | null;
    deltaPe: number | null;
    // GRIP 관련 지표
    epsGrowthRate: number | null;       // (NTM EPS - TTM EPS) / TTM EPS * 100
    forwardEpsGrowth: number | null;    // (FY2 EPS - FY1 EPS) / FY1 EPS * 100
    peg: number | null;                 // TTM P/E / EPS Growth Rate
    forwardPeg: number | null;          // Forward P/E / Forward EPS Growth
    gripScore: number | null;           // GRIP Score (복합 지표)
    gripStatus: 'high' | 'potential' | 'watch' | null;  // GRIP 상태
    // High-Beta 전용 지표 (GRIP-TS)
    turnaroundRatio: number | null;     // FY2 EPS / |TTM EPS| (흑자 전환 비율, TTM<0일 때만 유효)
    gripTsScore: number | null;         // GRIP-TS Score (턴어라운드 속도)
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
    gripThreshold?: number;
}

export interface RankingResponse {
    success: boolean;
    data: StockData[];
    metadata?: RankingMetadata;
    error?: string;
}

// GRIP 상태 정의
export type GripStatus = 'high' | 'potential' | 'watch' | null;
