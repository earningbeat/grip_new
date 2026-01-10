'use client';

import { StockData } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

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
    if (quarters === null) return { text: '—', color: 'bg-slate-700/30 text-slate-500' };
    if (quarters >= 99) return { text: '∞', color: 'bg-emerald-500/10 text-emerald-400' };
    if (quarters >= 6) return { text: `${quarters.toFixed(0)}Q`, color: 'bg-emerald-500/10 text-emerald-400' };
    if (quarters >= 3) return { text: `${quarters.toFixed(0)}Q`, color: 'bg-cyan-500/10 text-cyan-400' };
    if (quarters >= 1) return { text: `${quarters.toFixed(1)}Q`, color: 'bg-yellow-500/10 text-yellow-400' };
    return { text: `${quarters.toFixed(1)}Q`, color: 'bg-rose-500/10 text-rose-500' };
}

export default function HighBetaTable({ data, isLoading, onSelectStock }: HighBetaTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-3 animate-pulse">
                <div className="h-12 bg-slate-700/30 rounded-xl" />
                {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-800/30 rounded-xl" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-32 rounded-3xl bg-slate-900/40 border border-dashed border-slate-700">
                <p className="text-xl font-medium text-slate-400">턴어라운드 후보가 존재하지 않습니다</p>
                <p className="text-slate-500 mt-2">필터 기준: NASDAQ + 매출성장률 12.5%+ + Gross Margin 30%+</p>
            </div>
        );
    }

    return (
        <div className="relative group/table overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-amber-950/20 border-b border-amber-500/20">
                            <th className="px-4 py-4 text-xs font-bold text-slate-600 w-12 text-center">#</th>
                            <th className="px-4 py-4 text-xs font-bold text-slate-300 min-w-[120px]">TICKER</th>
                            <th className="px-4 py-4 text-xs font-bold text-amber-500 text-center">T-GRIP</th>
                            <th className="px-4 py-4 text-xs font-bold text-cyan-500 text-center hidden md:table-cell">RUNWAY</th>
                            <th className="px-4 py-4 text-xs font-bold text-emerald-500 text-right hidden lg:table-cell">GROWTH</th>
                            <th className="px-4 py-4 text-xs font-bold text-purple-500 text-right hidden lg:table-cell">GM</th>
                            <th className="px-4 py-4 text-xs font-bold text-rose-500 text-right">TTM EPS</th>
                            <th className="px-4 py-4 text-xs font-bold text-emerald-500 text-right">NTM EPS</th>
                            <th className="px-4 py-4 text-xs font-bold text-slate-300 text-right">PRICE</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                        {data.map((stock, index) => {
                            const cashBadge = getCashRunwayBadge(stock.cashRunwayQuarters ?? null);
                            const tGrip = stock.tGripScore ?? stock.turnaroundScore;

                            return (
                                <tr
                                    key={stock.ticker}
                                    onClick={() => onSelectStock?.(stock)}
                                    className="group hover:bg-amber-500/[0.03] transition-all cursor-pointer"
                                >
                                    <td className="px-4 py-5 text-center font-mono text-slate-600 text-xs">{index + 1}</td>
                                    <td className="px-4 py-5">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                                                    {stock.ticker}
                                                </span>
                                                {stock.cashRunwayQuarters !== null && stock.cashRunwayQuarters < 3 && (
                                                    <span className="text-rose-500 text-[10px] animate-pulse">⚠</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-500 truncate max-w-[120px] font-medium uppercase tracking-tight">
                                                {stock.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 text-center font-mono">
                                        <span className={`inline-block px-2 py-1 rounded-lg border text-sm font-black min-w-[44px] ${getTGripScoreColor(tGrip)}`}>
                                            {tGrip ? tGrip.toFixed(1) : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-5 text-center hidden md:table-cell">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${cashBadge.color}`}>
                                            {cashBadge.text}
                                        </span>
                                    </td>
                                    <td className="px-4 py-5 text-right font-mono text-xs hidden lg:table-cell">
                                        <span className={stock.revenueGrowthYoY && stock.revenueGrowthYoY > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                            {stock.revenueGrowthYoY !== undefined && stock.revenueGrowthYoY !== null
                                                ? formatPercent(stock.revenueGrowthYoY, 1)
                                                : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-5 text-right font-mono text-xs hidden lg:table-cell">
                                        <span className="text-slate-400 font-bold">
                                            {stock.grossMargin ? formatPercent(stock.grossMargin, 0) : '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-5 text-right font-mono text-xs">
                                        <span className="text-rose-500/80 font-bold">
                                            ${stock.ttmEps?.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-5 text-right font-mono text-xs">
                                        <span className="text-emerald-400 font-black">
                                            ${stock.ntmEps?.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-5 text-right font-mono text-xs font-bold text-white">
                                        ${formatNumber(stock.price)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* UI Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent pointer-events-none" />
        </div>
    );
}
