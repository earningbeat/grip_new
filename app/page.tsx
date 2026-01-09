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
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    stock?: StockData;
    excludeReason?: string;
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

  // 티커 검색 핸들러
  const handleSearch = useCallback(() => {
    if (!searchTicker.trim()) {
      setSearchResult(null);
      return;
    }

    const ticker = searchTicker.trim().toUpperCase();

    // 먼저 Quality 데이터에서 검색
    const qualityStock = qualityData.find(s => s.ticker === ticker);
    if (qualityStock) {
      setSearchResult({ found: true, stock: qualityStock });
      setActiveTab('quality');
      return;
    }

    // High-Beta 데이터에서 검색
    const highBetaStock = highBetaData.find(s => s.ticker === ticker);
    if (highBetaStock) {
      setSearchResult({ found: true, stock: highBetaStock });
      setActiveTab('high-beta');
      return;
    }

    // 제외된 종목 확인 (메타데이터 기반 추정)
    const excludeReasons = [
      'TTM EPS ≤ 0 (적자 기업)',
      'NTM EPS ≤ 0 (미래 적자 예상)',
      'Forward P/E > 300 (과대평가)',
      'Forward P/E < 1 (데이터 오류)',
      'EPS 성장률 < 22.7% (나스닥 100 평균 미만)'
    ];

    setSearchResult({
      found: false,
      excludeReason: `"${ticker}" 종목은 분석 대상에서 제외되었습니다.\n가능한 제외 사유:\n• ${excludeReasons.join('\n• ')}`
    });
  }, [searchTicker, qualityData, highBetaData]);

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
        {searchResult && (
          <div className={`mb-6 rounded-xl border p-4 animate-fade-in ${searchResult.found
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/10'
            }`}>
            {searchResult.found && searchResult.stock ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-emerald-400 font-bold">{searchResult.stock.ticker}</span>
                  <span className="text-slate-300 ml-2">{searchResult.stock.name}</span>
                  <span className="ml-4 text-cyan-400">GRIP Score: {searchResult.stock.gripScore?.toFixed(1) ?? '—'}</span>
                </div>
                <button onClick={() => setSearchResult(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-red-400 font-medium">검색 결과 없음</p>
                  <p className="text-slate-400 text-sm mt-1 whitespace-pre-line">{searchResult.excludeReason}</p>
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
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-400 mb-1">Turnaround Score</h3>
                  <p className="text-sm text-slate-300 mb-2">
                    TTM EPS 음수 → NTM EPS 양수 전환 종목. <strong>Delta = NTM - TTM</strong>이 클수록 높은 점수.
                  </p>
                  <p className="text-xs text-slate-400">
                    ⚠️ <strong>고위험</strong>: 실적 개선 지연 시 큰 손실 가능
                  </p>
                </div>
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
