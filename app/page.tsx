'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import RankingTable from '@/components/RankingTable';
import HighBetaTable from '@/components/HighBetaTable';
import MetadataCard from '@/components/MetadataCard';
import StockOverviewModal from '@/components/StockOverviewModal';
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

  // 모달 제어
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);

  // 티커 검색
  const [searchTicker, setSearchTicker] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    success: boolean;
    data?: StockData;
    metadata?: {
      symbol: string;
      isCached: boolean;
      timestamp: string;
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
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
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
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[98%] mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-shrink-0">
              <h1 className="text-lg sm:text-2xl font-bold">
                <span className="gradient-text">GRIP</span>
                <span className="text-slate-300 ml-1 sm:ml-2 hidden xs:inline">Tracker</span>
              </h1>
              <p className="text-[10px] sm:text-sm text-slate-500 hidden sm:block">
                Growth Re-rating Inflection Point
              </p>
            </div>

            {/* 티커 검색 */}
            <div className="flex-1 max-w-[200px] sm:max-w-[240px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchTicker}
                  onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as any)}
                  placeholder="Search ticker"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className={`mb-6 rounded-2xl border p-6 animate-fade-in backdrop-blur-sm ${searchResult.success && searchResult.data?.isTurnaround
            ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-orange-500/5'
            : searchResult.success && (searchResult.data?.isEligible || searchResult.data?.isQuality)
              ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5'
              : searchResult.success
                ? 'border-slate-200 bg-slate-50/50'
                : 'border-red-500/30 bg-red-500/10'
            }`}>
            {searchResult.success && searchResult.data ? (
              <div className="flex gap-6">
                {/* 왼쪽: GRIP Score 동그라미 */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center ${searchResult.data.isTurnaround
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30'
                    : (searchResult.data.isEligible || searchResult.data.isQuality)
                      ? 'bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/30'
                      : 'bg-gradient-to-br from-slate-600 to-slate-700'
                    }`}>
                    <span className="text-3xl font-bold text-white">
                      {searchResult.data.isTurnaround
                        ? searchResult.data.tGripScore?.toFixed(1) ?? '—'
                        : searchResult.data.gripScore?.toFixed(1) ?? '—'}
                    </span>
                    <span className="text-xs font-medium text-white/80">
                      {searchResult.data.isTurnaround ? 'T-GRIP' : 'GRIP'}
                    </span>
                  </div>
                  <span className="mt-2 text-xs text-slate-500">
                    {searchResult.data.isTurnaround ? '턴어라운드 점수' : 'Quality 점수'}
                  </span>
                </div>

                {/* 오른쪽: 상세 정보 */}
                <div className="flex-1">
                  {/* 헤더 */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl font-bold text-slate-900">{searchResult.data.ticker}</span>
                        <span className="text-lg text-slate-600">{searchResult.data.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">{searchResult.data.exchange}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">{searchResult.data.sector}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">{searchResult.data.industry}</span>
                        {searchResult.data.beta && (
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">β {searchResult.data.beta.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSearchResult(null)} className="text-slate-400 hover:text-white text-xl transition-colors">✕</button>
                  </div>

                  {/* 경고/상태 표시 */}
                  {searchResult.data.warnings && searchResult.data.warnings.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="flex flex-wrap gap-2">
                        {searchResult.data.warnings.map((w, i) => (
                          <span key={i} className="text-xs text-amber-400">⚠ {w}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 핵심 지표 그리드 */}
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Price</p>
                      <p className="text-lg font-mono font-bold text-slate-900">${searchResult.data.price.toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Market Cap</p>
                      <p className="text-lg font-mono font-bold text-slate-900">
                        {searchResult.data.marketCap >= 1e12
                          ? `$${(searchResult.data.marketCap / 1e12).toFixed(2)}T`
                          : `$${(searchResult.data.marketCap / 1e9).toFixed(1)}B`}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">TTM P/E</p>
                      <p className={`text-lg font-mono font-bold ${searchResult.data.ttmPe && searchResult.data.ttmPe > 0 ? 'text-white' : 'text-red-400'}`}>
                        {searchResult.data.ttmPe?.toFixed(1) ?? '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Fwd P/E</p>
                      <p className="text-lg font-mono font-bold text-blue-600">{searchResult.data.forwardPe?.toFixed(1) ?? '—'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                      <p className="text-[10px] text-purple-300 uppercase tracking-wide">Gap Ratio</p>
                      <p className={`text-lg font-mono font-bold ${searchResult.data.gapRatio && searchResult.data.gapRatio > 1.2 ? 'text-purple-400' : 'text-white'}`}>
                        {searchResult.data.gapRatio?.toFixed(2) ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* 재무 정보 섹션 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/30">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Revenue (TTM)</p>
                      <p className="text-base font-mono text-white">
                        {searchResult.data.revenue
                          ? `$${(searchResult.data.revenue / 1e9).toFixed(1)}B`
                          : '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/30">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Operating Income</p>
                      <p className={`text-base font-mono ${searchResult.data.operatingIncome && searchResult.data.operatingIncome > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {searchResult.data.operatingIncome
                          ? `$${(searchResult.data.operatingIncome / 1e9).toFixed(1)}B`
                          : '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/30">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Net Income</p>
                      <p className={`text-base font-mono ${searchResult.data.netIncome && searchResult.data.netIncome > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {searchResult.data.netIncome
                          ? `$${(searchResult.data.netIncome / 1e9).toFixed(1)}B`
                          : '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/30">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Net Margin</p>
                      <p className={`text-base font-mono ${searchResult.data.netMargin && searchResult.data.netMargin > 10 ? 'text-emerald-400' : searchResult.data.netMargin && searchResult.data.netMargin > 0 ? 'text-white' : 'text-red-400'}`}>
                        {searchResult.data.netMargin?.toFixed(1) ?? '—'}%
                      </p>
                    </div>
                  </div>

                  {/* EPS & 성장률 섹션 */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">TTM EPS</p>
                      <p className={`text-base font-mono font-bold ${searchResult.data.ttmEps > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${searchResult.data.ttmEps.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">NTM EPS (Est)</p>
                      <p className={`text-base font-mono font-bold ${searchResult.data.ntmEps && searchResult.data.ntmEps > 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
                        ${searchResult.data.ntmEps?.toFixed(2) ?? '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">CAGR (3Y)</p>
                      <p className={`text-base font-mono font-bold ${searchResult.data.cagr3Y && searchResult.data.cagr3Y > 20 ? 'text-emerald-400' : 'text-white'}`}>
                        {searchResult.data.cagr3Y?.toFixed(1) ?? '—'}%
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">PEG</p>
                      <p className={`text-base font-mono font-bold ${searchResult.data.peg && searchResult.data.peg < 1.5 ? 'text-emerald-400' : 'text-white'}`}>
                        {searchResult.data.peg?.toFixed(2) ?? '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                      <p className="text-[10px] text-purple-300 uppercase tracking-wide">Upgrades (6M)</p>
                      <p className="text-base font-mono font-bold text-white flex items-center gap-1">
                        {searchResult.data.upgradeCount6M ?? 0}회
                        {(searchResult.data.upgradeCount6M ?? 0) > 0 && <span className="text-sm">🚀</span>}
                      </p>
                    </div>
                  </div>

                  {/* 분석 정보 */}
                  <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
                    <span>FMP API · 10-Q Data + CAGR Calculation</span>
                    <span>Updated: {searchResult.data?.lastUpdated ? new Date(searchResult.data.lastUpdated).toLocaleString('ko-KR') : 'N/A'}</span>
                  </div>
                </div>
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
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
            <button
              onClick={() => setActiveTab('quality')}
              className={`px-6 py-3 rounded-lg font-medium text-sm transition-all ${activeTab === 'quality'
                ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
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
                ? 'bg-white text-amber-600 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
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
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-600 font-bold text-sm">G</span>
                  </div>
                  <h3 className="font-semibold text-cyan-600">GRIP Score</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2">PEG Score + Gap Score (2-20점)</p>
                <p className="text-xs text-slate-600">
                  정규분포 기반 복합 점수. 높을수록 고성장 저평가 종목.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-sm">P</span>
                  </div>
                  <h3 className="font-semibold text-slate-800">PEG Score</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">정규분포 기반 (1-10점)</p>
                <p className="text-xs text-slate-500">
                  PEG가 <span className="text-emerald-400">낮을수록</span> 높은 점수. 저평가 고성장.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">G</span>
                  </div>
                  <h3 className="font-semibold text-slate-800">Gap Score</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2">정규분포 기반 (1-10점)</p>
                <p className="text-xs text-slate-600">
                  Gap Ratio가 <span className="text-blue-600">높을수록</span> 높은 점수. 실적 개선 기대.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">A</span>
                  </div>
                  <h3 className="font-semibold text-slate-800">Adj. PEG</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2">나스닥 100 벤치마크</p>
                <p className="text-xs text-slate-600">
                  성장률 <span className="text-purple-600 font-semibold">{metadata?.benchmarkGrowth || 0}%</span> & P/E <span className="text-purple-600 font-semibold">{metadata?.benchmarkPe || 0}x</span> 이상 대상.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <span className="text-amber-600 font-bold text-sm">T</span>
                  </div>
                  <h3 className="font-semibold text-amber-600">T-GRIP Score</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2">Turnaround GRIP (1-10점)</p>
                <p className="text-xs text-slate-600">
                  정규분포 기반. Delta가 <span className="text-amber-600">클수록</span> 높은 점수.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-600 font-bold text-sm">Δ</span>
                  </div>
                  <h3 className="font-semibold text-slate-800">Delta</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2">NTM EPS − TTM EPS</p>
                <p className="text-xs text-slate-600">
                  EPS 변화량. <span className="text-cyan-600">클수록</span> 강력한 턴어라운드.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-600 font-bold text-sm">−</span>
                  </div>
                  <h3 className="font-semibold text-slate-800">TTM EPS</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2">과거 12개월 실적</p>
                <p className="text-xs text-slate-600">
                  <span className="text-red-600">음수</span> = 현재 적자 상태
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-600 font-bold text-sm">+</span>
                  </div>
                  <h3 className="font-semibold text-slate-800">NTM EPS</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2">향후 12개월 예상</p>
                <p className="text-xs text-slate-600">
                  <span className="text-emerald-600">양수</span> = 흑자 전환 예상
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
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
            <RankingTable data={qualityData} isLoading={isLoading} onSelectStock={setSelectedStock} />
          ) : (
            <HighBetaTable data={highBetaData} isLoading={isLoading} onSelectStock={setSelectedStock} />
          )}
        </section>

        {/* Stock Overview Modal */}
        {selectedStock && (
          <StockOverviewModal
            stock={selectedStock}
            onClose={() => setSelectedStock(null)}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-800/50 text-center text-slate-500 text-sm">
          <p>
            데이터: <a href="https://financialmodelingprep.com/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Financial Modeling Prep (FMP)</a>
          </p>
          <p className="mt-1 text-[10px] text-slate-600 uppercase tracking-widest">
            Growth Plan Optimized Pipeline v2.0
          </p>
          <p className="mt-4 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            ⚠️ 투자 결정에 대한 최종 책임은 사용자에게 있으며, 본 서비스는 상장사 공시 데이터와 CAGR 추정치 기반의 리서치 결과물입니다.
          </p>
        </footer>
      </div>
    </main>
  );
}
