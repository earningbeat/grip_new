'use client';

import { useState, useMemo } from 'react';
import { StockData, getGripGrade } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface RankingTableProps {
    data: StockData[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

type SortKey = 'gripScore' | 'pegScore' | 'gapScore' | 'price' | 'epsGrowthRate' | 'gapRatio' | 'marketCap' | 'grossMargin';
type SortOrder = 'asc' | 'desc';

// GRIP Score 색상 (2-20점)
function getGripScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 18) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 16) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    if (score >= 14) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (score >= 12) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-slate-400 bg-slate-700/30 border-slate-700/50';
}

// 정렬 화살표 컴포넌트
function SortArrow({ active, order }: { active: boolean; order: SortOrder }) {
    if (!active) return null;
    return <span className="ml-0.5">{order === 'desc' ? '↓' : '↑'}</span>;
}

export default function RankingTable({ data, isLoading, onSelectStock }: RankingTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('gripScore');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const aVal = a[sortKey] ?? -Infinity;
            const bVal = b[sortKey] ?? -Infinity;
            return sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
        });
    }, [data, sortKey, sortOrder]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-2 animate-pulse">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-800/30 rounded-xl" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-700">
                <p className="text-lg font-medium text-slate-400">데이터 없음</p>
                <p className="text-slate-500 text-sm mt-1">스캔 완료 후 새로고침하세요.</p>
            </div>
        );
    }

    // Mobile Card Layout
    return (
        <div className="space-y-2">
            {/* Mobile Sort Controls */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:hidden">
                {(['gripScore', 'marketCap', 'epsGrowthRate', 'price'] as SortKey[]).map(key => (
                    <button
                        key={key}
                        onClick={() => handleSort(key)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${sortKey === key
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                    >
                        {key === 'gripScore' ? 'GRIP' : key === 'marketCap' ? 'MKT CAP' : key === 'epsGrowthRate' ? 'GROWTH' : 'PRICE'}
                        <SortArrow active={sortKey === key} order={sortOrder} />
                    </button>
                ))}
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-2">
                {sortedData.map((stock, index) => (
                    <div
                        key={stock.ticker}
                        onClick={() => onSelectStock?.(stock)}
                        className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 active:bg-slate-800/50 transition-all"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600 font-mono">#{index + 1}</span>
                                    <span className="text-base font-black text-white">{stock.ticker}</span>
                                    {stock.beta && stock.beta > 1.5 && (
                                        <span className="px-1 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-bold">HB</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5 uppercase">{stock.name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`px-2 py-1 rounded-lg border text-sm font-black ${getGripScoreColor(stock.gripScore)}`}>
                                    {stock.gripScore ? stock.gripScore.toFixed(1) : '—'}
                                </span>
                                <span className="text-[10px] text-slate-500">GRIP</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/50">
                            <div>
                                <p className="text-[9px] text-slate-600 uppercase">Price</p>
                                <p className="text-xs font-bold text-white">${formatNumber(stock.price)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-600 uppercase">Mkt Cap</p>
                                <p className="text-xs font-semibold text-slate-300">{formatMarketCap(stock.marketCap)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-600 uppercase">Growth</p>
                                <p className={`text-xs font-bold ${stock.epsGrowthRate && stock.epsGrowthRate > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {stock.epsGrowthRate ? `${stock.epsGrowthRate.toFixed(0)}%` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-600 uppercase">Gap</p>
                                <p className="text-xs font-semibold text-indigo-400">{stock.gapRatio ? `${stock.gapRatio.toFixed(2)}x` : '—'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/40 border-b border-slate-800">
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-600 w-10 text-center">#</th>
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-300">TICKER</th>
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 cursor-pointer" onClick={() => handleSort('gripScore')}>
                                    GRIP <SortArrow active={sortKey === 'gripScore'} order={sortOrder} />
                                </th>
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 cursor-pointer hidden lg:table-cell" onClick={() => handleSort('marketCap')}>
                                    MKT CAP <SortArrow active={sortKey === 'marketCap'} order={sortOrder} />
                                </th>
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 cursor-pointer text-right" onClick={() => handleSort('epsGrowthRate')}>
                                    GROWTH <SortArrow active={sortKey === 'epsGrowthRate'} order={sortOrder} />
                                </th>
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 cursor-pointer text-right hidden lg:table-cell" onClick={() => handleSort('gapRatio')}>
                                    GAP <SortArrow active={sortKey === 'gapRatio'} order={sortOrder} />
                                </th>
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 text-right hidden xl:table-cell">MARGINS</th>
                                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 text-right cursor-pointer" onClick={() => handleSort('price')}>
                                    PRICE <SortArrow active={sortKey === 'price'} order={sortOrder} />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {sortedData.map((stock, index) => (
                                <tr
                                    key={stock.ticker}
                                    onClick={() => onSelectStock?.(stock)}
                                    className="group hover:bg-emerald-500/[0.03] transition-all cursor-pointer"
                                >
                                    <td className="px-3 py-3 text-center font-mono text-slate-600 text-[10px]">{index + 1}</td>
                                    <td className="px-3 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{stock.ticker}</span>
                                            <span className="text-[9px] text-slate-500 truncate max-w-[100px]">{stock.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className={`inline-block px-2 py-1 rounded-lg border text-xs font-black ${getGripScoreColor(stock.gripScore)}`}>
                                            {stock.gripScore ? stock.gripScore.toFixed(1) : '—'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-slate-400 text-xs hidden lg:table-cell">{formatMarketCap(stock.marketCap)}</td>
                                    <td className="px-3 py-3 text-right">
                                        <span className={`text-xs font-bold ${stock.epsGrowthRate && stock.epsGrowthRate > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {stock.epsGrowthRate ? `${stock.epsGrowthRate.toFixed(1)}%` : '—'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-right hidden lg:table-cell">
                                        <span className="text-xs text-indigo-400">{stock.gapRatio ? `${stock.gapRatio.toFixed(2)}x` : '—'}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right text-[10px] hidden xl:table-cell">
                                        <span className="text-slate-400">{stock.grossMargin ? formatPercent(stock.grossMargin, 0) : '—'}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right text-xs font-bold text-white">${formatNumber(stock.price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
