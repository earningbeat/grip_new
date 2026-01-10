'use client';

import { useState, useMemo } from 'react';
import { StockData, getGripGrade } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface RankingTableProps {
    data: StockData[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

type SortKey = 'compositeRank' | 'pegPctl' | 'gapPctl' | 'growthPctl' | 'price' | 'epsGrowthRate' | 'marketCap';
type SortOrder = 'asc' | 'desc';

// Percentile 색상 (0-100)
function getPctlColor(pctl: number | null): string {
    if (pctl === null || pctl === undefined) return 'text-slate-500';
    if (pctl >= 80) return 'text-emerald-400';
    if (pctl >= 60) return 'text-cyan-400';
    if (pctl >= 40) return 'text-yellow-400';
    if (pctl >= 20) return 'text-orange-400';
    return 'text-slate-400';
}

// Composite Rank 색상
function getRankColor(rank: number | null): string {
    if (rank === null) return 'text-slate-500';
    if (rank >= 80) return 'text-emerald-400 bg-emerald-500/20';
    if (rank >= 60) return 'text-cyan-400 bg-cyan-500/20';
    if (rank >= 40) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-slate-400 bg-slate-700/50';
}

// 정렬 화살표
function SortArrow({ active, order }: { active: boolean; order: SortOrder }) {
    return (
        <span className={`ml-1 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
            {order === 'desc' ? '↓' : '↑'}
        </span>
    );
}

export default function RankingTable({ data, isLoading, onSelectStock }: RankingTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('compositeRank');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const sortedData = useMemo(() => {
        return [...data].sort((a: any, b: any) => {
            const aVal = a[sortKey] ?? -Infinity;
            const bVal = b[sortKey] ?? -Infinity;
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
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

    const headerClass = (key: SortKey) => `
        cursor-pointer select-none group hover:text-white transition-colors
        ${sortKey === key ? 'text-cyan-400' : ''}
    `;

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
                <p className="text-lg font-medium">데이터가 없습니다</p>
                <p className="text-sm mt-1">NASDAQ Top 100 성장률 기준을 초과하는 종목이 없습니다</p>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-2">
                {sortedData.map((stock: any, index) => (
                    <div
                        key={stock.ticker}
                        onClick={() => onSelectStock?.(stock)}
                        className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 active:bg-slate-800/50"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600">#{index + 1}</span>
                                    <span className="font-bold text-white">{stock.ticker}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{stock.name}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getRankColor(stock.compositeRank)}`}>
                                    Top {100 - (stock.compositeRank || 0)}%
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                                <p className="text-slate-600">PEG</p>
                                <p className={getPctlColor(stock.pegPctl)}>{stock.pegPctl ?? '—'}%</p>
                            </div>
                            <div>
                                <p className="text-slate-600">GAP</p>
                                <p className={getPctlColor(stock.gapPctl)}>{stock.gapPctl ?? '—'}%</p>
                            </div>
                            <div>
                                <p className="text-slate-600">Growth</p>
                                <p className={getPctlColor(stock.growthPctl)}>{stock.growthPctl ?? '—'}%</p>
                            </div>
                            <div>
                                <p className="text-slate-600">Price</p>
                                <p className="text-white">${formatNumber(stock.price)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className="px-3 py-4 text-left font-semibold text-slate-300 w-12">#</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-300">Ticker</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-300 hidden xl:table-cell">Name</th>
                            <th
                                className={`px-3 py-4 text-center font-semibold ${headerClass('compositeRank')}`}
                                onClick={() => handleSort('compositeRank')}
                            >
                                <span className="inline-flex items-center text-cyan-400" title="Composite Percentile Rank">
                                    RANK
                                    <SortArrow active={sortKey === 'compositeRank'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={`px-3 py-4 text-center font-semibold hidden lg:table-cell ${headerClass('pegPctl')}`}
                                onClick={() => handleSort('pegPctl')}
                                title="PEG Percentile (higher = better value)"
                            >
                                <span className="inline-flex items-center text-emerald-400">
                                    PEG %ile
                                    <SortArrow active={sortKey === 'pegPctl'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={`px-3 py-4 text-center font-semibold hidden lg:table-cell ${headerClass('gapPctl')}`}
                                onClick={() => handleSort('gapPctl')}
                                title="Gap Ratio Percentile"
                            >
                                <span className="inline-flex items-center text-blue-400">
                                    GAP %ile
                                    <SortArrow active={sortKey === 'gapPctl'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={`px-3 py-4 text-center font-semibold hidden md:table-cell ${headerClass('growthPctl')}`}
                                onClick={() => handleSort('growthPctl')}
                            >
                                <span className="inline-flex items-center text-purple-400">
                                    Growth %ile
                                    <SortArrow active={sortKey === 'growthPctl'} order={sortOrder} />
                                </span>
                            </th>
                            <th className="px-3 py-4 text-right font-semibold text-slate-300 hidden xl:table-cell">
                                EPS Growth
                            </th>
                            <th
                                className={`px-3 py-4 text-right font-semibold ${headerClass('price')}`}
                                onClick={() => handleSort('price')}
                            >
                                <span className="inline-flex items-center">
                                    Price
                                    <SortArrow active={sortKey === 'price'} order={sortOrder} />
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((stock: any, index) => (
                            <tr
                                key={stock.ticker}
                                onClick={() => onSelectStock?.(stock)}
                                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group cursor-pointer"
                            >
                                <td className="px-3 py-3 text-slate-500 font-mono text-xs">{index + 1}</td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                            {stock.ticker}
                                        </span>
                                    </div>
                                    <span className="block text-xs text-slate-500 xl:hidden truncate max-w-[100px]">
                                        {stock.name}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-slate-400 hidden xl:table-cell max-w-[180px] truncate text-xs">
                                    {stock.name}
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`font-bold font-mono px-2 py-1 rounded text-sm ${getRankColor(stock.compositeRank)}`}>
                                        {stock.compositeRank ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center font-mono hidden lg:table-cell">
                                    <span className={getPctlColor(stock.pegPctl)}>
                                        {stock.pegPctl ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center font-mono hidden lg:table-cell">
                                    <span className={getPctlColor(stock.gapPctl)}>
                                        {stock.gapPctl ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center font-mono hidden md:table-cell">
                                    <span className={getPctlColor(stock.growthPctl)}>
                                        {stock.growthPctl ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs text-slate-300 hidden xl:table-cell">
                                    {stock.epsGrowthRate ? `${stock.epsGrowthRate.toFixed(1)}%` : '—'}
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
