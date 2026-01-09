/**
 * GRIP Score 정규분포 기반 점수화 모듈
 * 
 * 정규분포를 사용하여 아웃라이어를 식별하고 1-10점 범위로 점수화
 */

/**
 * 평균 계산
 */
function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * 표준편차 계산
 */
function standardDeviation(values: number[], avg?: number): number {
    if (values.length < 2) return 0;
    const m = avg ?? mean(values);
    const squaredDiffs = values.map(v => Math.pow(v - m, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Z-score 계산
 * @param value 개별 값
 * @param avg 평균
 * @param std 표준편차
 */
function zScore(value: number, avg: number, std: number): number {
    if (std === 0) return 0;
    return (value - avg) / std;
}

/**
 * Z-score를 백분위로 변환 (정규분포 CDF 근사)
 * Abramowitz & Stegun 근사식 사용
 */
function zToPercentile(z: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
}

/**
 * 백분위를 1-10 점수로 변환
 * @param percentile 0-1 범위의 백분위
 * @param invert true면 낮은 백분위가 높은 점수 (PEG용)
 */
function percentileToScore(percentile: number, invert: boolean = false): number {
    const p = invert ? (1 - percentile) : percentile;
    // 0-1 범위를 1-10 범위로 매핑, 소수점 1자리
    const score = 1 + p * 9;
    return Math.round(score * 10) / 10;
}

/**
 * PEG Score 계산
 * PEG가 낮을수록 높은 점수 (1-10)
 * 
 * @param peg 개별 종목의 PEG
 * @param allPegs 필터링된 모든 종목의 PEG 배열
 */
export function calculatePegScore(peg: number | null, allPegs: number[]): number | null {
    if (peg === null || allPegs.length < 2) return null;

    const validPegs = allPegs.filter(p => p > 0 && isFinite(p));
    if (validPegs.length < 2) return null;

    const avg = mean(validPegs);
    const std = standardDeviation(validPegs, avg);
    const z = zScore(peg, avg, std);
    const percentile = zToPercentile(z);

    // PEG는 낮을수록 좋으므로 invert=true
    return percentileToScore(percentile, true);
}

/**
 * Gap Ratio Score 계산
 * Gap Ratio가 높을수록 높은 점수 (1-10)
 * 
 * @param gap 개별 종목의 Gap Ratio
 * @param allGaps 필터링된 모든 종목의 Gap Ratio 배열
 */
export function calculateGapScore(gap: number | null, allGaps: number[]): number | null {
    if (gap === null || allGaps.length < 2) return null;

    const validGaps = allGaps.filter(g => g > 0 && isFinite(g));
    if (validGaps.length < 2) return null;

    const avg = mean(validGaps);
    const std = standardDeviation(validGaps, avg);
    const z = zScore(gap, avg, std);
    const percentile = zToPercentile(z);

    // Gap Ratio는 높을수록 좋으므로 invert=false
    return percentileToScore(percentile, false);
}

/**
 * GRIP Score 계산 (최종)
 * PEG Score + Gap Score = 2-20점
 */
export function calculateFinalGripScore(
    pegScore: number | null,
    gapScore: number | null
): number | null {
    if (pegScore === null || gapScore === null) return null;
    return Math.round((pegScore + gapScore) * 10) / 10;
}

/**
 * 턴어라운드 델타 계산 (High-Beta용)
 * NTM EPS - TTM EPS (TTM이 음수이므로 결과는 양수)
 * 
 * @param ttmEps TTM EPS (음수)
 * @param ntmEps NTM EPS (양수)
 */
export function calculateTurnaroundDelta(
    ttmEps: number,
    ntmEps: number
): number | null {
    // TTM이 음수이고 NTM이 양수인 경우에만 유효
    if (ttmEps >= 0 || ntmEps <= 0) return null;
    return ntmEps - ttmEps;  // 예: 0.5 - (-5) = 5.5
}

/**
 * 턴어라운드 Score 계산 (High-Beta용)
 * 델타가 클수록 높은 점수 (1-10)
 */
export function calculateTurnaroundScore(
    delta: number | null,
    allDeltas: number[]
): number | null {
    if (delta === null || allDeltas.length < 2) return null;

    const validDeltas = allDeltas.filter(d => d > 0 && isFinite(d));
    if (validDeltas.length < 2) return null;

    const avg = mean(validDeltas);
    const std = standardDeviation(validDeltas, avg);
    const z = zScore(delta, avg, std);
    const percentile = zToPercentile(z);

    // 델타는 높을수록 좋으므로 invert=false
    return percentileToScore(percentile, false);
}

/**
 * 일시적 EPS 급증 경고 플래그 체크
 * 
 * @param epsGrowthRate EPS 성장률 (%)
 * @param revenueGrowthRate 매출 성장률 (%)
 * @param fy1Eps FY1 EPS
 * @param fy2Eps FY2 EPS
 */
export interface EpsQualityCheck {
    isQualityGrowth: boolean;
    warnings: string[];
}

export function checkEpsQuality(
    epsGrowthRate: number | null,
    revenueGrowthRate: number | null,
    fy1Eps: number,
    fy2Eps: number
): EpsQualityCheck {
    const warnings: string[] = [];
    let isQualityGrowth = true;

    // 방법 A: FY1→FY2 연속성 검증
    if (fy2Eps <= fy1Eps) {
        warnings.push('FY2 EPS가 FY1보다 낮음 (성장 둔화)');
        isQualityGrowth = false;
    }

    // 방법 B: 매출 동반 성장 검증
    if (epsGrowthRate !== null && revenueGrowthRate !== null) {
        if (epsGrowthRate > revenueGrowthRate * 2) {
            warnings.push('EPS 성장률이 매출 성장률의 2배 초과 (일시적 요인 가능성)');
            isQualityGrowth = false;
        }
    }

    return { isQualityGrowth, warnings };
}

// 유틸리티 함수 내보내기
export { mean, standardDeviation, zScore, zToPercentile };
