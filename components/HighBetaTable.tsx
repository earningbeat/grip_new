'use client';

import { StockData } from '@/types';
import { formatNumber } from '@/lib/utils/format';

interface HighBetaTableProps {
    data: StockData[];
    isLoading?: boolean;
}

// 턴어라운드 Score 색상 (1-10점)
function getTurnaroundScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-emerald-400 bg-emerald-500/20';
    if (score >= 6) return 'text-cyan-400 bg-cyan-500/20';
    if (score >= 4) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-slate-400 bg-slate-700/50';
}

export default function HighBetaTable({ data, isLoading }: HighBetaTableProps) {
    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-12 bg-slate-700/50 rounded-lg mb-2" />
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-800/50 rounded-lg mb-1" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-20 text-slate-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-lg font-medium">턴어라운드 후보가 없습니다</p>
                <p className="text-sm mt-1">TTM EPS 음수 → NTM EPS 양수 종목이 없습니다</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-amber-500/30 bg-slate-900/50 backdrop-blur-sm">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-amber-500/30">
                        <th className="px-3 py-4 text-left font-semibold text-slate-300">#</th>
                        <th className="px-3 py-4 text-left font-semibold text-slate-300">Ticker</th>
                        <th className="px-3 py-4 text-left font-semibold text-slate-300 hidden xl:table-cell">Name</th>
                        <th className="px-3 py-4 text-center font-semibold text-amber-400">
                            <span className="inline-flex items-center gap-1" title="T-GRIP Score (1-10)">
                                T-GRIP
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </span>
                        </th>
                        <th className="px-3 py-4 text-right font-semibold text-red-400">TTM EPS</th>
                        <th className="px-3 py-4 text-right font-semibold text-emerald-400">NTM EPS</th>
                        <th className="px-3 py-4 text-right font-semibold text-cyan-400 hidden md:table-cell">Delta</th>
                        <th className="px-3 py-4 text-right font-semibold text-slate-300 hidden lg:table-cell">FY2 P/E</th>
                        <th className="px-3 py-4 text-right font-semibold text-slate-300">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((stock, index) => (
                        <tr
                            key={stock.ticker}
                            className="border-b border-slate-800/50 hover:bg-amber-500/5 transition-colors group"
                        >
                            <td className="px-3 py-3 text-slate-500 font-mono text-xs">{index + 1}</td>
                            <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                                        {stock.ticker}
                                    </span>
                                    {!stock.isQualityGrowth && (
                                        <span className="text-red-400" title={stock.epsWarnings.join(', ')}>⚠</span>
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
                                <span className={`font-bold font-mono px-2 py-1 rounded text-sm ${getTurnaroundScoreColor(stock.turnaroundScore)}`}>
                                    {stock.turnaroundScore ? stock.turnaroundScore.toFixed(1) : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono">
                                <span className="text-red-400 font-semibold">
                                    {formatNumber(stock.ttmEps, 2)}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono">
                                <span className={stock.ntmEps && stock.ntmEps > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                                    {stock.ntmEps ? formatNumber(stock.ntmEps, 2) : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono hidden md:table-cell">
                                <span className={`px-2 py-1 rounded ${stock.turnaroundDelta && stock.turnaroundDelta > 1
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-slate-400'
                                    }`}>
                                    {stock.turnaroundDelta ? `+${stock.turnaroundDelta.toFixed(2)}` : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs text-slate-300 hidden lg:table-cell">
                                {stock.fy2Pe ? formatNumber(stock.fy2Pe, 1) : '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-white text-xs">
                                ${formatNumber(stock.price)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
