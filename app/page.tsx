'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import RankingTable from '@/components/RankingTable';
import HighBetaTable from '@/components/HighBetaTable';
import MetadataCard from '@/components/MetadataCard';
import type { StockData, RankingMetadata, RankingResponse } from '@/types';

type TabType = 'quality' | 'high-beta';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('quality');
  const [qualityData, setQualityData] = useState<StockData[]>([]);
  const [highBetaData, setHighBetaData] = useState<StockData[]>([]);
  const [metadata, setMetadata] = useState<RankingMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 티커 검색
  const [searchTicker, setSearchTicker] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    success: boolean;
    data?: {
      ticker: string;
      name: string;
      sector: string;
      exchange: string;
      price: number;
      marketCap: number;
      ttmEps: number;
      fy1Eps: number | null;
      fy2Eps: number | null;
      ntmEps: number | null;
      ttmPe: number | null;
      forwardPe: number | null;
      fy2Pe: number | null;
      gapRatio: number | null;
      epsGrowthRate: number | null;
      peg: number | null;
      isEligible: boolean;
      excludeReason: string | null;
      warnings: string[];
      analystCount: number;
    };
    error?: string;
  } | null>(null);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [qualityResponse, highBetaResponse] = await Promise.all([
        fetch('/api/ranking'),
        fetch('/api/high-beta')
      ]);

      const qualityResult: RankingResponse = await qualityResponse.json();
      const highBetaResult: RankingResponse = await highBetaResponse.json();

      if (qualityResult.success) {
        setQualityData(qualityResult.data);
        setMetadata(qualityResult.metadata ?? null);
      } else {
        setError(qualityResult.error ?? 'Unknown error occurred');
      }

      if (highBetaResult.success) {
        setHighBetaData(highBetaResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  // 티커 검색 핸들러 (API 호출)
  const handleSearch = useCallback(async () => {
    if (!searchTicker.trim()) {
      setSearchResult(null);
      return;
    }

    const ticker = searchTicker.trim().toUpperCase();
    setIsSearching(true);
    setSearchResult(null);

    try {
      const response = await fetch(`/api/analyze/${ticker}`);
      const result = await response.json();
      setSearchResult(result);
    } catch (err) {
      setSearchResult({
        success: false,
        error: err instanceof Error ? err.message : '분석 중 오류 발생'
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchTicker]);

  const currentData = activeTab === 'quality' ? qualityData : highBetaData;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                <span className="gradient-text">GRIP</span>
                <span className="text-slate-300 ml-2">Tracker</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Growth Re-rating Inflection Point
              </p>
            </div>

            {/* 티커 검색 */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchTicker}
                  onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="티커 검색 (예: NVDA)"
                  className="w-40 md:w-56 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 결과 표시 */}
        {isSearching && (
          <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-cyan-400">분석 중...</span>
            </div>
          </div>
        )}

        {searchResult && !isSearching && (
          <div className={`mb-6 rounded-xl border p-4 animate-fade-in ${searchResult.success && searchResult.data?.isEligible
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : searchResult.success
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-red-500/30 bg-red-500/10'
            }`}>
            {searchResult.success && searchResult.data ? (
              <div>
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">{searchResult.data.ticker}</span>
                    <span className="text-slate-400">{searchResult.data.name}</span>
                    <span className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300">{searchResult.data.exchange}</span>
                    <span className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300">{searchResult.data.sector}</span>
                  </div>
                  <button onClick={() => setSearchResult(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
                </div>

                {/* 제외/경고 표시 */}
                {!searchResult.data.isEligible && searchResult.data.excludeReason && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                    <span className="text-red-400 font-medium">⚠ 제외 사유: </span>
                    <span className="text-red-300">{searchResult.data.excludeReason}</span>
                  </div>
                )}

                {searchResult.data.warnings.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
                    <span className="text-amber-400 font-medium">경고: </span>
                    {searchResult.data.warnings.map((w, i) => (
                      <span key={i} className="text-amber-300 ml-2">• {w}</span>
                    ))}
                  </div>
                )}

                {/* 지표 그리드 */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">Price</p>
                    <p className="text-lg font-mono text-white">${searchResult.data.price.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">Market Cap</p>
                    <p className="text-lg font-mono text-white">${(searchResult.data.marketCap / 1e9).toFixed(1)}B</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">TTM EPS</p>
                    <p className={`text-lg font-mono ${searchResult.data.ttmEps > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {searchResult.data.ttmEps.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">NTM EPS</p>
                    <p className={`text-lg font-mono ${searchResult.data.ntmEps && searchResult.data.ntmEps > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {searchResult.data.ntmEps?.toFixed(2) ?? '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">Gap Ratio</p>
                    <p className={`text-lg font-mono ${searchResult.data.gapRatio && searchResult.data.gapRatio > 1.3 ? 'text-purple-400' : 'text-slate-400'}`}>
                      {searchResult.data.gapRatio?.toFixed(3) ?? '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">PEG</p>
                    <p className={`text-lg font-mono ${searchResult.data.peg && searchResult.data.peg < 1.5 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {searchResult.data.peg?.toFixed(2) ?? '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">EPS Growth</p>
                    <p className={`text-lg font-mono ${searchResult.data.epsGrowthRate && searchResult.data.epsGrowthRate > 22.7 ? 'text-cyan-400' : 'text-slate-400'}`}>
                      {searchResult.data.epsGrowthRate?.toFixed(1) ?? '—'}%
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">Fwd P/E</p>
                    <p className="text-lg font-mono text-slate-300">
                      {searchResult.data.forwardPe?.toFixed(1) ?? '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500 mb-1">Analyst #</p>
                    <p className={`text-lg font-mono ${searchResult.data.analystCount >= 5 ? 'text-white' : 'text-amber-400'}`}>
                      {searchResult.data.analystCount}
                    </p>
                  </div>
                </div>

                {/* GRIP 지표 요약 */}
                {searchResult.data.isEligible && (
                  <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <span className="text-cyan-400 font-medium">✓ GRIP 분석 대상 </span>
                    <span className="text-slate-300">
                      - Gap Ratio: {searchResult.data.gapRatio?.toFixed(2)},
                      PEG: {searchResult.data.peg?.toFixed(2)},
                      성장률: {searchResult.data.epsGrowthRate?.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-red-400 font-medium">검색 실패</p>
                  <p className="text-slate-400 text-sm mt-1">{searchResult.error}</p>
                </div>
                <button onClick={() => setSearchResult(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            )}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-red-400 font-medium">데이터 로드 실패</p>
                <p className="text-red-300/70 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Card */}
        <div className="mb-8 animate-slide-up">
          <MetadataCard
            metadata={metadata}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('quality')}
              className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${activeTab === 'quality'
                ? 'bg-emerald-500/20 text-emerald-400 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Quality Stocks</span>
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-emerald-500/30 text-emerald-400">
                  {qualityData.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('high-beta')}
              className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${activeTab === 'high-beta'
                ? 'bg-amber-500/20 text-amber-400 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>High-Beta</span>
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/30 text-amber-400">
                  {highBetaData.length}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Description - 새 점수 체계 반영 */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          {activeTab === 'quality' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-400 font-bold text-sm">G</span>
                  </div>
                  <h3 className="font-semibold text-cyan-400">GRIP Score</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">PEG Score + Gap Score (2-20점)</p>
                <p className="text-xs text-slate-500">
                  정규분포 기반 복합 점수. 높을수록 고성장 저평가 종목.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-sm">P</span>
                  </div>
                  <h3 className="font-semibold text-white">PEG Score</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">정규분포 기반 (1-10점)</p>
                <p className="text-xs text-slate-500">
                  PEG가 <span className="text-emerald-400">낮을수록</span> 높은 점수. 저평가 고성장.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-sm">G</span>
                  </div>
                  <h3 className="font-semibold text-white">Gap Score</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">정규분포 기반 (1-10점)</p>
                <p className="text-xs text-slate-500">
                  Gap Ratio가 <span className="text-blue-400">높을수록</span> 높은 점수. 실적 개선 기대.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 font-bold text-sm">A</span>
                  </div>
                  <h3 className="font-semibold text-white">Adj. PEG</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">나스닥 100 벤치마크</p>
                <p className="text-xs text-slate-500">
                  평균 성장률 <span className="text-purple-400">22.7%</span> 이상만 분석 대상.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <span className="text-amber-400 font-bold text-sm">T</span>
                  </div>
                  <h3 className="font-semibold text-amber-400">T-GRIP Score</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">Turnaround GRIP (1-10점)</p>
                <p className="text-xs text-slate-500">
                  정규분포 기반. Delta가 <span className="text-amber-400">클수록</span> 높은 점수.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-400 font-bold text-sm">Δ</span>
                  </div>
                  <h3 className="font-semibold text-white">Delta</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">NTM EPS − TTM EPS</p>
                <p className="text-xs text-slate-500">
                  EPS 변화량. <span className="text-cyan-400">클수록</span> 강력한 턴어라운드.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-400 font-bold text-sm">−</span>
                  </div>
                  <h3 className="font-semibold text-white">TTM EPS</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">과거 12개월 실적</p>
                <p className="text-xs text-slate-500">
                  <span className="text-red-400">음수</span> = 현재 적자 상태
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-sm">+</span>
                  </div>
                  <h3 className="font-semibold text-white">NTM EPS</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">향후 12개월 예상</p>
                <p className="text-xs text-slate-500">
                  <span className="text-emerald-400">양수</span> = 흑자 전환 예상
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              {activeTab === 'quality'
                ? `Top ${currentData.length} by GRIP Score`
                : `Turnaround Candidates (${currentData.length})`
              }
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {activeTab === 'quality'
                  ? '헤더 클릭으로 정렬 | 나스닥 100 벤치마크 필터 적용'
                  : 'TTM EPS 음수 & NTM EPS 양수 종목만 표시'
                }
              </span>
            </div>
          </div>

          {activeTab === 'quality' ? (
            <RankingTable data={qualityData} isLoading={isLoading} />
          ) : (
            <HighBetaTable data={highBetaData} isLoading={isLoading} />
          )}
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-800/50 text-center text-slate-500 text-sm">
          <p>
            데이터: <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Alpha Vantage</a>
          </p>
          <p className="mt-2 text-xs text-slate-600">
            ⚠️ 본 도구는 리서치 참고용이며, 투자 결정은 본인 책임입니다.
          </p>
        </footer>
      </div>
    </main>
  );
}
