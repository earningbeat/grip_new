import config from '@/config.json';
import type { GripStatus } from '@/types';

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
    // GRIP 관련 지표 (Quality: TTM > 0)
    epsGrowthRate: number | null;
    forwardEpsGrowth: number | null;
    peg: number | null;
    forwardPeg: number | null;
    gripScore: number | null;           // GRIP Score (복합 지표)
    gripStatus: GripStatus;
    // GRIP-TS 관련 지표 (High-Beta: TTM < 0)
    turnaroundRatio: number | null;     // FY2 EPS / |TTM EPS| (흑자 전환 비율)
    gripTsScore: number | null;         // GRIP-TS Score (턴어라운드 속도)
    fiscalYearEndMonth: number;
    lastUpdated: string;
}

export interface FilterResult {
    passed: StockData[];
    excluded: {
        stock: StockData;
        reason: string;
    }[];
}

/**
 * 음수 EPS 필터
 */
export function filterNegativeEps(data: StockData[]): FilterResult {
    const passed: StockData[] = [];
    const excluded: { stock: StockData; reason: string }[] = [];

    for (const stock of data) {
        if (stock.ttmEps <= 0) {
            excluded.push({ stock, reason: 'TTM EPS ≤ 0' });
        } else if (stock.ntmEps !== null && stock.ntmEps <= 0) {
            excluded.push({ stock, reason: 'NTM EPS ≤ 0' });
        } else {
            passed.push(stock);
        }
    }

    return { passed, excluded };
}

/**
 * Forward P/E 범위 필터
 */
export function filterPeRange(data: StockData[]): FilterResult {
    const { min_forward_pe, max_forward_pe } = config.logic_thresholds;
    const passed: StockData[] = [];
    const excluded: { stock: StockData; reason: string }[] = [];

    for (const stock of data) {
        if (stock.forwardPe === null) {
            excluded.push({ stock, reason: 'Forward P/E 계산 불가' });
        } else if (stock.forwardPe < min_forward_pe) {
            excluded.push({ stock, reason: `Forward P/E < ${min_forward_pe}` });
        } else if (stock.forwardPe > max_forward_pe) {
            excluded.push({ stock, reason: `Forward P/E > ${max_forward_pe}` });
        } else {
            passed.push(stock);
        }
    }

    return { passed, excluded };
}

/**
 * ETF/펀드 제외 필터
 */
export function filterFundsAndEtfs(data: StockData[], profiles: Map<string, boolean>): FilterResult {
    const passed: StockData[] = [];
    const excluded: { stock: StockData; reason: string }[] = [];

    for (const stock of data) {
        const isFundOrEtf = profiles.get(stock.ticker);
        if (isFundOrEtf) {
            excluded.push({ stock, reason: 'ETF 또는 펀드' });
        } else {
            passed.push(stock);
        }
    }

    return { passed, excluded };
}

/**
 * 모든 필터 적용 (파이프라인)
 */
export function applyAllFilters(data: StockData[]): FilterResult {
    let current = data;
    const allExcluded: { stock: StockData; reason: string }[] = [];

    // 1. 음수 EPS 필터
    if (config.logic_thresholds.exclude_negative_eps) {
        const result = filterNegativeEps(current);
        current = result.passed;
        allExcluded.push(...result.excluded);
    }

    // 2. P/E 범위 필터
    const peResult = filterPeRange(current);
    current = peResult.passed;
    allExcluded.push(...peResult.excluded);

    return {
        passed: current,
        excluded: allExcluded
    };
}

/**
 * Gap Ratio 기준 정렬
 */
export function sortByGapRatio(data: StockData[], order: 'asc' | 'desc' = 'desc'): StockData[] {
    return [...data].sort((a, b) => {
        const aRatio = a.gapRatio ?? -Infinity;
        const bRatio = b.gapRatio ?? -Infinity;
        return order === 'desc' ? bRatio - aRatio : aRatio - bRatio;
    });
}

/**
 * GRIP Score 기준 정렬
 */
export function sortByGripScore(data: StockData[], order: 'asc' | 'desc' = 'desc'): StockData[] {
    return [...data].sort((a, b) => {
        const aScore = a.gripScore ?? -Infinity;
        const bScore = b.gripScore ?? -Infinity;
        return order === 'desc' ? bScore - aScore : aScore - bScore;
    });
}

/**
 * GRIP Status 기준 필터
 */
export function filterByGripStatus(data: StockData[], statuses: GripStatus[]): StockData[] {
    return data.filter(stock => statuses.includes(stock.gripStatus));
}

/**
 * 상위 N개 추출
 */
export function getTopN(data: StockData[], n: number = config.output_settings.ranking_count): StockData[] {
    const sorted = sortByGapRatio(data, config.output_settings.sort_order as 'asc' | 'desc');
    return sorted.slice(0, n);
}

/**
 * GRIP 기준 상위 N개 추출
 */
export function getTopNByGrip(data: StockData[], n: number = config.output_settings.ranking_count): StockData[] {
    const sorted = sortByGripScore(data, 'desc');
    return sorted.slice(0, n);
}
