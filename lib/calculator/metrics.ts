import config from '@/config.json';
import type { GripStatus } from '@/types';

// GRIP 임계값 설정
const GRIP_THRESHOLDS = {
    PEG_HIGH_GROWTH: 1.5,        // PEG < 1.5면 고성장주
    GAP_RATIO_MIN: 1.2,          // Gap Ratio 최소 기준
    GAP_RATIO_STRONG: 1.3,       // Gap Ratio 강력 기준
    MIN_GROWTH_RATE: 5,          // 최소 성장률 (%)
};

/**
 * 회계연도 종료일까지 남은 개월 수 계산
 */
export function calculateMonthsRemaining(
    fiscalYearEndMonth: number = 12,
    referenceDate: Date = new Date()
): number {
    const currentMonth = referenceDate.getMonth() + 1;
    let monthsRemaining: number;

    if (currentMonth <= fiscalYearEndMonth) {
        monthsRemaining = fiscalYearEndMonth - currentMonth;
    } else {
        monthsRemaining = 12 - currentMonth + fiscalYearEndMonth;
    }

    return Math.max(1, Math.min(12, monthsRemaining));
}

/**
 * NTM EPS 근사 계산
 */
export function calculateNtmEps(
    fy1Eps: number,
    fy2Eps: number,
    monthsRemaining: number
): number {
    const fy1Weight = monthsRemaining / 12;
    const fy2Weight = 1 - fy1Weight;
    return fy1Eps * fy1Weight + fy2Eps * fy2Weight;
}

/**
 * TTM P/E 계산
 */
export function calculateTtmPe(price: number, ttmEps: number): number | null {
    if (ttmEps <= config.logic_thresholds.min_ttm_eps) {
        return null;
    }
    return price / ttmEps;
}

/**
 * Forward P/E 계산
 */
export function calculateForwardPe(price: number, ntmEps: number): number | null {
    if (ntmEps <= config.logic_thresholds.min_ntm_eps) {
        return null;
    }
    return price / ntmEps;
}

/**
 * Gap Ratio 계산
 * 정의: NTM_EPS / TTM_EPS
 * 의미: 1보다 클수록 미래 이익 성장이 가파름
 */
export function calculateGapRatio(ntmEps: number, ttmEps: number): number | null {
    if (ttmEps <= config.logic_thresholds.min_ttm_eps ||
        ntmEps <= config.logic_thresholds.min_ntm_eps) {
        return null;
    }
    return ntmEps / ttmEps;
}

/**
 * Delta P/E 계산
 */
export function calculateDeltaPe(ttmPe: number | null, forwardPe: number | null): number | null {
    if (ttmPe === null || forwardPe === null) {
        return null;
    }
    return ttmPe - forwardPe;
}

/**
 * EPS 성장률 계산 (%)
 * 공식: (NTM EPS - TTM EPS) / TTM EPS * 100
 */
export function calculateEpsGrowthRate(ntmEps: number, ttmEps: number): number | null {
    if (ttmEps <= 0) return null;
    return ((ntmEps - ttmEps) / ttmEps) * 100;
}

/**
 * Forward EPS 성장률 계산 (%)
 * 공식: (FY2 EPS - FY1 EPS) / FY1 EPS * 100
 */
export function calculateForwardEpsGrowth(fy1Eps: number, fy2Eps: number): number | null {
    if (fy1Eps <= 0) return null;
    return ((fy2Eps - fy1Eps) / fy1Eps) * 100;
}

/**
 * PEG 계산
 * 공식: P/E ÷ EPS Growth Rate
 */
export function calculatePeg(pe: number | null, growthRate: number | null): number | null {
    if (pe === null || growthRate === null || growthRate <= GRIP_THRESHOLDS.MIN_GROWTH_RATE) {
        return null;
    }
    return pe / growthRate;
}

/**
 * Forward PEG 계산
 * 공식: Forward P/E ÷ Forward EPS Growth Rate
 */
export function calculateForwardPeg(forwardPe: number | null, forwardGrowth: number | null): number | null {
    if (forwardPe === null || forwardGrowth === null || forwardGrowth <= GRIP_THRESHOLDS.MIN_GROWTH_RATE) {
        return null;
    }
    return forwardPe / forwardGrowth;
}

/**
 * GRIP Score 계산
 * 
 * GRIP = Growth Re-rating Inflection Point
 * 
 * 공식: Gap Ratio × (1 + (Current PEG - Forward PEG) / Current PEG)
 * → PEG 개선폭이 클수록, Gap Ratio가 높을수록 점수 높음
 * 
 * 단순화 버전: Gap Ratio × (Current PEG / Forward PEG)
 */
export function calculateGripScore(
    gapRatio: number | null,
    currentPeg: number | null,
    forwardPeg: number | null
): number | null {
    if (gapRatio === null) return null;

    // PEG 비교가 가능한 경우
    if (currentPeg !== null && forwardPeg !== null && forwardPeg > 0) {
        const pegImprovement = currentPeg / forwardPeg;
        return gapRatio * pegImprovement;
    }

    // PEG 비교 불가 시 Gap Ratio만 사용
    return gapRatio;
}

/**
 * GRIP 상태 판정
 * 
 * - high: 현재 PEG < 1.5 AND Gap Ratio > 1.3 (이미 고성장 + 실적 개선)
 * - potential: 현재 PEG >= 1.5 BUT Forward PEG < 1.5 AND Gap Ratio > 1.2 (리레이팅 진입 예정)
 * - watch: Gap Ratio > 1.2지만 PEG 조건 미충족 (관심 종목)
 * - null: 조건 미충족
 */
export function determineGripStatus(
    gapRatio: number | null,
    currentPeg: number | null,
    forwardPeg: number | null
): GripStatus {
    if (gapRatio === null) return null;

    const isHighGrowthPeg = currentPeg !== null && currentPeg < GRIP_THRESHOLDS.PEG_HIGH_GROWTH;
    const willBeHighGrowth = forwardPeg !== null && forwardPeg < GRIP_THRESHOLDS.PEG_HIGH_GROWTH;
    const hasStrongGap = gapRatio >= GRIP_THRESHOLDS.GAP_RATIO_STRONG;
    const hasMinGap = gapRatio >= GRIP_THRESHOLDS.GAP_RATIO_MIN;

    // HIGH: 현재 고성장 + 강력한 Gap Ratio
    if (isHighGrowthPeg && hasStrongGap) {
        return 'high';
    }

    // POTENTIAL: 아직 고성장은 아니지만 Forward PEG가 고성장 진입 예정
    if (!isHighGrowthPeg && willBeHighGrowth && hasMinGap) {
        return 'potential';
    }

    // WATCH: Gap Ratio만 충족
    if (hasMinGap) {
        return 'watch';
    }

    return null;
}

/**
 * FY2 P/E 계산
 * 공식: Price / FY2 EPS (고정 회계연도 기준)
 */
export function calculateFy2Pe(price: number, fy2Eps: number): number | null {
    if (fy2Eps <= 0) return null;
    return price / fy2Eps;
}

/**
 * 턴어라운드 비율 계산 (High-Beta용)
 * 공식: FY2 EPS / |TTM EPS|
 * 의미: 적자 대비 흑자 전환 규모 (높을수록 강력한 턴어라운드)
 * 조건: TTM EPS < 0 AND FY2 EPS > 0일 때만 유효
 */
export function calculateTurnaroundRatio(ttmEps: number, fy2Eps: number): number | null {
    if (ttmEps >= 0 || fy2Eps <= 0) return null;
    return fy2Eps / Math.abs(ttmEps);
}

/**
 * GRIP-TS Score 계산 (High-Beta 턴어라운드용)
 * 
 * 공식: (1 / Forward PEG) × Turnaround Ratio × 10
 * 의미: Forward PEG가 낮고 턴어라운드 비율이 높을수록 점수 높음
 * 
 * Forward PEG가 없는 경우 Turnaround Ratio만 사용
 */
export function calculateGripTsScore(
    forwardPeg: number | null,
    turnaroundRatio: number | null
): number | null {
    if (turnaroundRatio === null) return null;

    // Forward PEG가 있고 유효한 경우
    if (forwardPeg !== null && forwardPeg > 0) {
        // Forward PEG가 낮을수록, 턴어라운드 비율이 높을수록 점수 높음
        return (1 / forwardPeg) * turnaroundRatio * 10;
    }

    // Forward PEG가 없는 경우 턴어라운드 비율만 사용
    return turnaroundRatio;
}

/**
 * 모든 핵심 지표 일괄 계산 (GRIP + GRIP-TS 포함)
 */
export interface CalculatedMetrics {
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
    gripScore: number | null;
    gripStatus: GripStatus;
    // GRIP-TS (High-Beta)
    turnaroundRatio: number | null;
    gripTsScore: number | null;
}

export function calculateAllMetrics(
    price: number,
    ttmEps: number,
    fy1Eps: number,
    fy2Eps: number,
    monthsRemaining: number
): CalculatedMetrics {
    const ntmEps = calculateNtmEps(fy1Eps, fy2Eps, monthsRemaining);
    const ttmPe = calculateTtmPe(price, ttmEps);
    const forwardPe = calculateForwardPe(price, ntmEps);
    const fy2Pe = calculateFy2Pe(price, fy2Eps);
    const gapRatio = calculateGapRatio(ntmEps, ttmEps);
    const deltaPe = calculateDeltaPe(ttmPe, forwardPe);

    // GRIP 관련 지표
    const epsGrowthRate = calculateEpsGrowthRate(ntmEps, ttmEps);
    const forwardEpsGrowth = calculateForwardEpsGrowth(fy1Eps, fy2Eps);
    const peg = calculatePeg(ttmPe, epsGrowthRate);
    const forwardPeg = calculateForwardPeg(forwardPe, forwardEpsGrowth);
    const gripScore = calculateGripScore(gapRatio, peg, forwardPeg);
    const gripStatus = determineGripStatus(gapRatio, peg, forwardPeg);

    // GRIP-TS 관련 지표 (High-Beta)
    const turnaroundRatio = calculateTurnaroundRatio(ttmEps, fy2Eps);
    const gripTsScore = calculateGripTsScore(forwardPeg, turnaroundRatio);

    return {
        ntmEps,
        ttmPe,
        forwardPe,
        fy2Pe,
        gapRatio,
        deltaPe,
        epsGrowthRate,
        forwardEpsGrowth,
        peg,
        forwardPeg,
        gripScore,
        gripStatus,
        turnaroundRatio,
        gripTsScore
    };
}

export { GRIP_THRESHOLDS };

