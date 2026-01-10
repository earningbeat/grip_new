/**
 * GRIP Score 계산 유틸리티 (단순화 버전)
 * 애널리스트 컨센서스 가중치 제거, PEG + GAP 합산에 집중
 */

export interface ScoringMetrics {
    peg: number | null;
    gapRatio: number | null;
}

export interface GripScoreResult {
    pegScore: number;
    gapScore: number;
    totalScore: number;
}

/**
 * GRIP Score (Quality Stocks용)
 * PEG 점수 (0-5) + GAP 점수 (0-5) = 0-10 범위
 */
export function calculateGripScore(metrics: ScoringMetrics): GripScoreResult {
    const { peg, gapRatio } = metrics;

    // 1. PEG Score (0-5점)
    let pegScore = 0;
    if (peg !== null && peg > 0) {
        pegScore = Math.max(0, Math.min(5, (2.5 - peg) * 2.5));
    }

    // 2. GAP Score (0-5점)
    let gapScore = 0;
    if (gapRatio !== null && gapRatio > 0) {
        gapScore = Math.max(0, Math.min(5, (gapRatio - 1) * 10));
    }

    return {
        pegScore: Math.round(pegScore * 10) / 10,
        gapScore: Math.round(gapScore * 10) / 10,
        totalScore: Math.round((pegScore + gapScore) * 10) / 10
    };
}

/**
 * T-GRIP Score (Turnaround용)
 * NTM EPS 개선폭 + 현금 안전성 + 매출 성장
 */
export function calculateTGripScore(
    ttmEps: number,
    ntmEps: number,
    cashRunwayQuarters: number | null,
    revGrowth: number | null
): number {
    // TTM EPS가 음수일 때만 의미있음
    if (ttmEps >= 0) return 0;

    // 1. Improvement Score (0-7점)
    // EPS 개선폭: 음수에서 0 또는 양수로 전환 시 높은 점수
    const delta = ntmEps - ttmEps;
    const impScore = Math.min(7, Math.max(0, delta * 2));

    // 2. Safety Score (0-3점)
    let safetyScore = 0;
    if (cashRunwayQuarters !== null) {
        if (cashRunwayQuarters >= 8) safetyScore += 2;
        else if (cashRunwayQuarters >= 4) safetyScore += 1;
    }
    if (revGrowth !== null && revGrowth > 0.2) safetyScore += 1;

    return Math.round((impScore + safetyScore) * 10) / 10;
}
