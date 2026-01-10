/**
 * 나스닥 100 벤치마크 데이터
 * 
 * GRIP Score 계산 시 저PE 저성장주 필터링에 사용
 * 데모 모드에서는 하드코딩, 실제 모드에서는 API로 갱신
 */

// 2026년 1월 기준 나스닥 100 평균값 (데모용)
export const NASDAQ100_BENCHMARK = {
  // EPS 관련
  avgTtmEps: 8.25,              // 평균 TTM EPS
  avgForwardEps: 10.12,         // 평균 NTM EPS
  avgEpsGrowthRate: 22.7,       // 평균 EPS 성장률 (%)

  // P/E 관련 (참고용, 주요 필터에는 EPS 사용)
  avgTtmPe: 32.5,               // 평균 TTM P/E
  avgForwardPe: 26.8,           // 평균 Forward P/E

  // PEG 관련
  avgPeg: 1.43,                 // 평균 PEG

  // 매출 성장률 (일시적 EPS 급증 검증용)
  avgRevenueGrowth: 12.5,       // 평균 매출 성장률 (%)

  // 메타데이터
  lastUpdated: '2026-01-09T00:00:00.000Z',
  source: 'demo'
} as const;

/**
 * 벤치마크 기준 필터링 조건
 */
export const BENCHMARK_THRESHOLDS = {
  // Adj.PEG 필터링: 평균 이상의 성장률을 가져야 함
  minEpsGrowthRate: NASDAQ100_BENCHMARK.avgEpsGrowthRate,

  // 일시적 EPS 급증 경고: EPS 성장률이 매출 성장률의 2배 초과 시
  epsToRevenueGrowthRatio: 2.0,

  // FY1→FY2 연속성: FY2 EPS가 FY1 EPS보다 낮으면 경고
  minFy2GrowthRate: 0,          // FY2 > FY1 이어야 함

  // ========== High-Beta 필터링 기준 ==========
  // 매출 성장률 최소 (나스닥 100 평균)
  minRevenueGrowth: NASDAQ100_BENCHMARK.avgRevenueGrowth,

  // Gross Margin 최소 (성장주 기준)
  minGrossMargin: 30,

  // 최소 현금 버팀 분기 수 (유상증자 없이)
  minCashRunwayQuarters: 3,

  // EV/Revenue 상한 (과대평가 제외)
  maxEvToRevenue: 15,

  // 최소 시가총액 (페니스톡 제외, USD)
  minMarketCap: 100_000_000,
} as const;

export type BenchmarkData = typeof NASDAQ100_BENCHMARK;
