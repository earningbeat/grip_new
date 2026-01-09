import config from '@/config.json';
import type { GripStatus } from '@/types';
import { NASDAQ100_BENCHMARK, BENCHMARK_THRESHOLDS } from '@/lib/data/nasdaq100-benchmark';

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
    forwardPe: number | null;
    fy2Pe: number | null;
    gapRatio: number | null;
    deltaPe: number | null;
    epsGrowthRate: number | null;
    forwardEpsGrowth: number | null;
    peg: number | null;
    forwardPeg: number | null;
    // 새 GRIP 점수 체계
    pegScore: number | null;
    gapScore: number | null;
    gripScore: number | null;
    gripStatus: GripStatus;
    // EPS 품질 체크
    isQualityGrowth: boolean;
    epsWarnings: string[];
    // High-Beta
    turnaroundDelta: number | null;
    turnaroundScore: number | null;
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
 * Adj.PEG 필터링: 나스닥 100 평균 이상의 성장률을 가진 종목만 통과
 */
export function filterByBenchmark(data: StockData[]): FilterResult {
    const minGrowth = BENCHMARK_THRESHOLDS.minEpsGrowthRate;
    const passed: StockData[] = [];
    const excluded: { stock: StockData; reason: string }[] = [];

    for (const stock of data) {
        if (stock.epsGrowthRate === null) {
            excluded.push({ stock, reason: 'EPS 성장률 계산 불가' });
        } else if (stock.epsGrowthRate < minGrowth) {
            excluded.push({ stock, reason: `EPS 성장률 < ${minGrowth.toFixed(1)}% (나스닥 100 평균 미만)` });
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

    // 3. Adj.PEG 필터 (나스닥 100 평균 이상 성장률)
    const benchmarkResult = filterByBenchmark(current);
    current = benchmarkResult.passed;
    allExcluded.push(...benchmarkResult.excluded);

    return {
        passed: current,
        excluded: allExcluded
    };
}

/**
 * GRIP Score 기준 정렬 (새 점수 체계)
 */
export function sortByGripScore(data: StockData[], order: 'asc' | 'desc' = 'desc'): StockData[] {
    return [...data].sort((a, b) => {
        const aScore = a.gripScore ?? -Infinity;
        const bScore = b.gripScore ?? -Infinity;
        return order === 'desc' ? bScore - aScore : aScore - bScore;
    });
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
 * 턴어라운드 Score 기준 정렬 (High-Beta용)
 */
export function sortByTurnaroundScore(data: StockData[], order: 'asc' | 'desc' = 'desc'): StockData[] {
    return [...data].sort((a, b) => {
        const aScore = a.turnaroundScore ?? -Infinity;
        const bScore = b.turnaroundScore ?? -Infinity;
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
 * 상위 N개 추출 (GRIP Score 기준)
 */
export function getTopN(data: StockData[], n: number = config.output_settings.ranking_count): StockData[] {
    const sorted = sortByGripScore(data, 'desc');
    return sorted.slice(0, n);
}

/**
 * High-Beta 상위 N개 추출 (Turnaround Score 기준)
 */
export function getTopNHighBeta(data: StockData[], n: number = config.output_settings.ranking_count): StockData[] {
    const sorted = sortByTurnaroundScore(data, 'desc');
    return sorted.slice(0, n);
}
