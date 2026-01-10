'use client';

import { StockData } from '@/types';
import { formatNumber, formatPercent } from '@/lib/utils/format';

interface HighBetaTableProps {
    data: StockData[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

// T-GRIP Score 색상 (0-10점)
function getTGripScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (score >= 6) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    if (score >= 4) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-slate-400 bg-slate-700/30 border-slate-700/50';
}

// Cash Runway 배지
function getCashRunwayBadge(quarters: number | null): { text: string; color: string } {
    if (quarters === null) return { text: '—', color: 'text-slate-500' };
    if (quarters >= 99) return { text: '∞', color: 'text-emerald-400' };
    if (quarters >= 6) return { text: `${quarters.toFixed(0)}Q`, color: 'text-emerald-400' };
    if (quarters >= 3) return { text: `${quarters.toFixed(0)}Q`, color: 'text-cyan-400' };
    if (quarters >= 1) return { text: `${quarters.toFixed(1)}Q`, color: 'text-yellow-400' };
    return { text: `${quarters.toFixed(1)}Q`, color: 'text-rose-500' };
}

export default function HighBetaTable({ data, isLoading, onSelectStock }: HighBetaTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-2 animate-pulse">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-800/30 rounded-xl" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-700">
                <p className="text-lg font-medium text-slate-400">턴어라운드 후보 없음</p>
                <p className="text-slate-500 text-sm mt-1">필터: Rev Growth 12.5%+, GM 30%+</p>
            </div>
        );
    }

    // Mobile Card Layout
    return (
        <div className="space-y-2">
            {/* Mobile Card List */}
            <div className="md:hidden space-y-2">
                {data.map((stock, index) => {
                    const tGrip = stock.tGripScore ?? stock.turnaroundScore;
                    const cashBadge = getCashRunwayBadge(stock.cashRunwayQuarters ?? null);

                    return (
                        <div
                            key={stock.ticker}
                            onClick={() => onSelectStock?.(stock)}
                            className="bg-slate-900/60 border border-amber-500/10 rounded-xl p-4 active:bg-slate-800/50 transition-all"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-600 font-mono">#{index + 1}</span>
                                        <span className="text-base font-black text-white">{stock.ticker}</span>
                                        {stock.cashRunwayQuarters !== null && stock.cashRunwayQuarters < 3 && (
                                            <span className="text-rose-500 text-xs animate-pulse">⚠</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5 uppercase">{stock.name}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-1 rounded-lg border text-sm font-black ${getTGripScoreColor(tGrip)}`}>
                                        {tGrip ? tGrip.toFixed(1) : '—'}
                                    </span>
                                    <span className="text-[10px] text-slate-500">T-GRIP</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/50">
                                <div>
                                    <p className="text-[9px] text-slate-600 uppercase">TTM EPS</p>
                                    <p className="text-xs font-bold text-rose-400">${stock.ttmEps?.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-600 uppercase">NTM EPS</p>
                                    <p className="text-xs font-bold text-emerald-400">${stock.ntmEps?.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-600 uppercase">Runway</p>
                                    <p className={`text-xs font-bold ${cashBadge.color}`}>{cashBadge.text}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-600 uppercase">Price</p>
                                    <p className="text-xs font-bold text-white">${formatNumber(stock.price)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-amber-950/20 border-b border-amber-500/20">
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-600 w-10 text-center">#</th>
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-300">TICKER</th>
                                <th className="px-3 py-3 text-[10px] font-bold text-amber-500 text-center">T-GRIP</th>
                                <th className="px-3 py-3 text-[10px] font-bold text-cyan-500 text-center hidden lg:table-cell">RUNWAY</th>
                                <th className="px-3 py-3 text-[10px] font-bold text-rose-500 text-right">TTM EPS</th>
                                <th className="px-3 py-3 text-[10px] font-bold text-emerald-500 text-right">NTM EPS</th>
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-300 text-right">PRICE</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {data.map((stock, index) => {
                                const tGrip = stock.tGripScore ?? stock.turnaroundScore;
                                const cashBadge = getCashRunwayBadge(stock.cashRunwayQuarters ?? null);

                                return (
                                    <tr
                                        key={stock.ticker}
                                        onClick={() => onSelectStock?.(stock)}
                                        className="group hover:bg-amber-500/[0.03] transition-all cursor-pointer"
                                    >
                                        <td className="px-3 py-3 text-center font-mono text-slate-600 text-[10px]">{index + 1}</td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{stock.ticker}</span>
                                                <span className="text-[9px] text-slate-500 truncate max-w-[100px]">{stock.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className={`inline-block px-2 py-1 rounded-lg border text-xs font-black ${getTGripScoreColor(tGrip)}`}>
                                                {tGrip ? tGrip.toFixed(1) : '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                                            <span className={`text-xs font-bold ${cashBadge.color}`}>{cashBadge.text}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right text-xs font-bold text-rose-400">${stock.ttmEps?.toFixed(2)}</td>
                                        <td className="px-3 py-3 text-right text-xs font-bold text-emerald-400">${stock.ntmEps?.toFixed(2)}</td>
                                        <td className="px-3 py-3 text-right text-xs font-bold text-white">${formatNumber(stock.price)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
