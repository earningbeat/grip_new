'use client';

import { StockData, getGripGrade } from '@/types';
import { formatNumber } from '@/lib/utils/format';

interface RankingTableProps {
    data: StockData[];
    isLoading?: boolean;
}

// GRIP Score 색상 (2-20점)
function getGripScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 18) return 'text-emerald-400 bg-emerald-500/20';
    if (score >= 16) return 'text-cyan-400 bg-cyan-500/20';
    if (score >= 14) return 'text-blue-400 bg-blue-500/20';
    if (score >= 12) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-slate-400 bg-slate-700/50';
}

// 개별 점수 색상 (1-10점)
function getScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-emerald-400';
    if (score >= 6) return 'text-cyan-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-slate-400';
}

export default function RankingTable({ data, isLoading }: RankingTableProps) {
    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-12 bg-slate-700/50 rounded-lg mb-2" />
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-800/50 rounded-lg mb-1" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-20 text-slate-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">데이터가 없습니다</p>
                <p className="text-sm mt-1">API 키를 설정하고 데이터를 갱신해주세요</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700/50">
                        <th className="px-3 py-4 text-left font-semibold text-slate-300">#</th>
                        <th className="px-3 py-4 text-left font-semibold text-slate-300">Ticker</th>
                        <th className="px-3 py-4 text-left font-semibold text-slate-300 hidden xl:table-cell">Name</th>
                        <th className="px-3 py-4 text-center font-semibold text-cyan-400">
                            <span className="inline-flex items-center gap-1" title="GRIP Score (2-20점)">
                                GRIP
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </span>
                        </th>
                        <th className="px-3 py-4 text-right font-semibold text-emerald-400 hidden md:table-cell" title="PEG Score (1-10)">PEG</th>
                        <th className="px-3 py-4 text-right font-semibold text-blue-400 hidden lg:table-cell" title="Gap Score (1-10)">Gap</th>
                        <th className="px-3 py-4 text-right font-semibold text-slate-300">Price</th>
                        <th className="px-3 py-4 text-right font-semibold text-slate-300 hidden md:table-cell">EPS Growth</th>
                        <th className="px-3 py-4 text-right font-semibold text-purple-400 hidden lg:table-cell">Gap Ratio</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((stock, index) => (
                        <tr
                            key={stock.ticker}
                            className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                        >
                            <td className="px-3 py-3 text-slate-500 font-mono text-xs">{index + 1}</td>
                            <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                        {stock.ticker}
                                    </span>
                                    {!stock.isQualityGrowth && (
                                        <span className="text-amber-400" title={stock.epsWarnings.join(', ')}>⚠</span>
                                    )}
                                </div>
                                <span className="block text-xs text-slate-500 xl:hidden truncate max-w-[100px]">
                                    {stock.name}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-slate-400 hidden xl:table-cell max-w-[180px] truncate text-xs" title={stock.name}>
                                {stock.name}
                            </td>
                            <td className="px-3 py-3 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className={`font-bold font-mono px-2 py-1 rounded text-sm ${getGripScoreColor(stock.gripScore)}`}>
                                        {stock.gripScore ? stock.gripScore.toFixed(1) : '—'}
                                    </span>
                                    <span className="text-xs text-slate-500">{getGripGrade(stock.gripScore)}</span>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-right font-mono hidden md:table-cell">
                                <span className={getScoreColor(stock.pegScore)}>
                                    {stock.pegScore ? stock.pegScore.toFixed(1) : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono hidden lg:table-cell">
                                <span className={getScoreColor(stock.gapScore)}>
                                    {stock.gapScore ? stock.gapScore.toFixed(1) : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-white text-xs">
                                ${formatNumber(stock.price)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs hidden md:table-cell">
                                <span className={stock.epsGrowthRate && stock.epsGrowthRate > 50 ? 'text-emerald-400' : 'text-slate-300'}>
                                    {stock.epsGrowthRate ? `${stock.epsGrowthRate.toFixed(1)}%` : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs hidden lg:table-cell">
                                <span className={`px-2 py-1 rounded ${stock.gapRatio && stock.gapRatio > 1.5
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : stock.gapRatio && stock.gapRatio > 1.3
                                            ? 'bg-cyan-500/20 text-cyan-400'
                                            : 'text-slate-400'
                                    }`}>
                                    {stock.gapRatio ? stock.gapRatio.toFixed(2) : '—'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
