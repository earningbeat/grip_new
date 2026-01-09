'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // 두 API를 병렬로 호출
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

  const currentData = activeTab === 'quality' ? qualityData : highBetaData;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                <span className="gradient-text">Re-rating</span>
                <span className="text-slate-300 ml-2">Tracker</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                밸류에이션 리레이팅 후보 추적
              </p>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <span>High-Beta (Turnaround)</span>
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/30 text-amber-400">
                  {highBetaData.length}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Description */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          {activeTab === 'quality' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-400 font-bold text-sm">G</span>
                  </div>
                  <h3 className="font-semibold text-cyan-400">GRIP</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">Growth Re-rating Inflection Point</p>
                <p className="text-xs text-slate-500">
                  PEG + Gap Ratio 복합 지표. 고성장 진입 또는 진입 예정 종목 식별.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-sm">P</span>
                  </div>
                  <h3 className="font-semibold text-white">PEG Ratio</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">P/E ÷ EPS Growth%</p>
                <p className="text-xs text-slate-500">
                  <span className="text-emerald-400">&lt; 1.5</span> = 고성장주. 낮을수록 저평가.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-sm">F</span>
                  </div>
                  <h3 className="font-semibold text-white">Forward PEG</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">Fwd P/E ÷ FY2 Growth%</p>
                <p className="text-xs text-slate-500">
                  <span className="text-blue-400">&lt; 1.5</span> = 고성장 진입 예정. 리레이팅 시그널.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 font-bold text-sm">R</span>
                  </div>
                  <h3 className="font-semibold text-white">Gap Ratio</h3>
                </div>
                <p className="text-xs text-slate-400 mb-2">NTM EPS ÷ TTM EPS</p>
                <p className="text-xs text-slate-500">
                  <span className="text-purple-400">&gt; 1.3</span> = 강력한 실적 개선 예상.
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
                  <h3 className="font-semibold text-amber-400 mb-1">High-Beta: 턴어라운드 후보</h3>
                  <p className="text-sm text-slate-300 mb-2">
                    현재 적자(TTM EPS ≤ 0)이지만 미래 흑자 전환(Forward EPS &gt; 0)이 예상되는 종목입니다.
                  </p>
                  <p className="text-xs text-slate-400">
                    ⚠️ <strong>고위험 투자</strong>: 실적 개선이 지연되거나 예상에 못 미칠 경우 큰 손실이 발생할 수 있습니다.
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
                ? `Top ${currentData.length} by Gap Ratio`
                : `Turnaround Candidates (${currentData.length})`
              }
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {activeTab === 'quality'
                  ? '음수 EPS 및 비정상 P/E 종목 자동 제외'
                  : 'TTM EPS 음수 & FY2 EPS 양수 종목만 표시'
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
            데이터 제공: <a href="https://financialmodelingprep.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Financial Modeling Prep</a>
            {' / '}
            <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">Alpha Vantage</a>
          </p>
          <p className="mt-2 text-xs text-slate-600">
            ⚠️ 본 도구는 리서치 참고용이며, 투자 결정은 본인 책임입니다.
          </p>
        </footer>
      </div>
    </main>
  );
}
