'use client';

import { StockData } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface HighBetaTableProps {
    data: any[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

// Percentile 색상
function getPctlColor(pctl: number | null): string {
    if (pctl === null || pctl === undefined) return 'text-slate-500';
    if (pctl >= 80) return 'text-emerald-400';
    if (pctl >= 60) return 'text-amber-400';
    if (pctl >= 40) return 'text-yellow-400';
    return 'text-slate-400';
}

// T-GRIP Score 색상
function getTGripColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-amber-400 bg-amber-500/20';
    if (score >= 6) return 'text-orange-400 bg-orange-500/20';
    if (score >= 4) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-slate-400 bg-slate-700/50';
}

// Rule of 40 색상
function getR40Color(r40: number | null): string {
    if (r40 === null) return 'text-slate-500';
    if (r40 >= 40) return 'text-emerald-400';
    if (r40 >= 30) return 'text-cyan-400';
    if (r40 >= 20) return 'text-yellow-400';
    return 'text-red-400';
}

// Cash Runway 색상
function getRunwayColor(quarters: number | null): string {
    if (quarters === null) return 'text-slate-500';
    if (quarters >= 8) return 'text-emerald-400';
    if (quarters >= 4) return 'text-cyan-400';
    if (quarters >= 2) return 'text-yellow-400';
    return 'text-red-400';
}

export default function HighBetaTable({ data, isLoading, onSelectStock }: HighBetaTableProps) {
    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-12 bg-amber-700/20 rounded-lg mb-2" />
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-14 bg-amber-800/10 rounded-lg mb-1" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-20 text-slate-400">
                <p className="text-lg font-medium">턴어라운드 후보 없음</p>
                <p className="text-sm mt-1">TTM EPS 음수 + 매출 존재 조건을 만족하는 종목이 없습니다</p>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-2">
                {data.map((stock, index) => (
                    <div
                        key={stock.ticker}
                        onClick={() => onSelectStock?.(stock)}
                        className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4 active:bg-slate-800/50"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600">#{index + 1}</span>
                                    <span className="font-bold text-white">{stock.ticker}</span>
                                    {stock.cashRunwayQuarters && stock.cashRunwayQuarters < 4 && (
                                        <span className="text-red-400 text-xs">⚠</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{stock.name}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getTGripColor(stock.tGripScore)}`}>
                                    {stock.tGripScore?.toFixed(1) ?? '—'}
                                </span>
                                <p className="text-[10px] text-slate-500 mt-1">T-GRIP</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                                <p className="text-slate-600">Rule40</p>
                                <p className={getR40Color(stock.ruleOf40)}>{stock.ruleOf40 !== null ? stock.ruleOf40.toFixed(0) : '—'}</p>
                            </div>
                            <div>
                                <p className="text-slate-600">EV/Rev</p>
                                <p className="text-slate-300">{stock.evRevenue ? stock.evRevenue.toFixed(1) + 'x' : '—'}</p>
                            </div>
                            <div>
                                <p className="text-slate-600">GM</p>
                                <p className="text-slate-300">{stock.grossMargin ? formatPercent(stock.grossMargin, 0) : '—'}</p>
                            </div>
                            <div>
                                <p className="text-slate-600">Runway</p>
                                <p className={getRunwayColor(stock.cashRunwayQuarters)}>
                                    {stock.cashRunwayQuarters ? `${stock.cashRunwayQuarters.toFixed(0)}Q` : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-amber-500/30 bg-slate-900/50 backdrop-blur-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-amber-500/30 bg-amber-900/10">
                            <th className="px-3 py-4 text-left font-semibold text-slate-300 w-12">#</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-300">Ticker</th>
                            <th className="px-3 py-4 text-center font-semibold text-amber-400">T-GRIP</th>
                            <th className="px-3 py-4 text-center font-semibold text-emerald-400" title="Rule of 40 = Rev Growth % + Gross Margin %">
                                Rule of 40
                            </th>
                            <th className="px-3 py-4 text-center font-semibold text-cyan-400 hidden lg:table-cell" title="Enterprise Value / Revenue">
                                EV/Rev
                            </th>
                            <th className="px-3 py-4 text-center font-semibold text-purple-400 hidden lg:table-cell">
                                Rev Growth
                            </th>
                            <th className="px-3 py-4 text-center font-semibold text-blue-400 hidden md:table-cell">
                                Gross Margin
                            </th>
                            <th className="px-3 py-4 text-center font-semibold text-rose-400" title="Cash Runway (Quarters)">
                                Runway
                            </th>
                            <th className="px-3 py-4 text-right font-semibold text-slate-300">
                                Price
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((stock, index) => (
                            <tr
                                key={stock.ticker}
                                onClick={() => onSelectStock?.(stock)}
                                className="border-b border-slate-800/50 hover:bg-amber-500/5 transition-colors group cursor-pointer"
                            >
                                <td className="px-3 py-3 text-slate-500 font-mono text-xs">{index + 1}</td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                                            {stock.ticker}
                                        </span>
                                        {stock.cashRunwayQuarters && stock.cashRunwayQuarters < 4 && (
                                            <span className="text-red-400 text-xs" title="Low Cash Runway">⚠</span>
                                        )}
                                    </div>
                                    <span className="block text-xs text-slate-500 truncate max-w-[120px]">
                                        {stock.name}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`font-bold font-mono px-2 py-1 rounded text-sm ${getTGripColor(stock.tGripScore)}`}>
                                        {stock.tGripScore?.toFixed(1) ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center font-mono">
                                    <span className={getR40Color(stock.ruleOf40)}>
                                        {stock.ruleOf40 !== null ? stock.ruleOf40.toFixed(0) : '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center font-mono hidden lg:table-cell text-slate-300">
                                    {stock.evRevenue ? stock.evRevenue.toFixed(1) + 'x' : '—'}
                                </td>
                                <td className="px-3 py-3 text-center font-mono hidden lg:table-cell">
                                    <span className={stock.revenueGrowthYoY > 0.2 ? 'text-emerald-400' : 'text-slate-400'}>
                                        {stock.revenueGrowthYoY !== null ? formatPercent(stock.revenueGrowthYoY, 0) : '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center font-mono hidden md:table-cell">
                                    <span className={stock.grossMargin >= 0.5 ? 'text-purple-400' : 'text-slate-400'}>
                                        {stock.grossMargin ? formatPercent(stock.grossMargin, 0) : '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center font-mono">
                                    <span className={getRunwayColor(stock.cashRunwayQuarters)}>
                                        {stock.cashRunwayQuarters !== null
                                            ? (stock.cashRunwayQuarters >= 99 ? '∞' : `${stock.cashRunwayQuarters.toFixed(0)}Q`)
                                            : '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-white text-xs">
                                    ${formatNumber(stock.price)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
