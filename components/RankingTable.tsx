'use client';

import { useState, useMemo } from 'react';
import { StockData, getGripGrade } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface RankingTableProps {
    data: StockData[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

type SortKey = 'gripScore' | 'ttmEps' | 'ntmEps' | 'epsGrowthRate' | 'peg' | 'gapRatio' | 'price';
type SortOrder = 'asc' | 'desc';

// GRIP Score 색상 (0-10점)
function getGripScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-emerald-400 bg-emerald-500/20';
    if (score >= 6) return 'text-cyan-400 bg-cyan-500/20';
    if (score >= 4) return 'text-yellow-400 bg-yellow-500/20';
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
    const [sortKey, setSortKey] = useState<SortKey>('gripScore');
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
        px-3 py-4 text-right font-semibold text-[11px] uppercase tracking-wide
        ${sortKey === key ? 'text-cyan-400' : 'text-slate-400'}
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
                <p className="text-sm mt-1">필터링 조건을 만족하는 종목이 없습니다</p>
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
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getGripScoreColor(stock.gripScore)}`}>
                                    {stock.gripScore?.toFixed(1) ?? '—'}
                                </span>
                                <p className="text-[10px] text-slate-500 mt-1">GRIP</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                                <p className="text-slate-600">TTM EPS</p>
                                <p className="text-white">${stock.ttmEps?.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-slate-600">NTM EPS</p>
                                <p className="text-cyan-400">${stock.ntmEps?.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-slate-600">Growth</p>
                                <p className={stock.epsGrowthRate > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                                    {stock.epsGrowthRate?.toFixed(0)}%
                                </p>
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
                            <th className="px-3 py-4 text-left font-semibold text-slate-400 text-[11px] w-12">#</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-300 text-[11px]">TICKER</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-400 text-[11px] hidden xl:table-cell">NAME</th>
                            <th
                                className={headerClass('gripScore').replace('text-right', 'text-center')}
                                onClick={() => handleSort('gripScore')}
                            >
                                <span className="inline-flex items-center text-emerald-400">
                                    GRIP
                                    <SortArrow active={sortKey === 'gripScore'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={headerClass('ttmEps')}
                                onClick={() => handleSort('ttmEps')}
                            >
                                <span className="inline-flex items-center">
                                    TTM EPS
                                    <SortArrow active={sortKey === 'ttmEps'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={headerClass('ntmEps')}
                                onClick={() => handleSort('ntmEps')}
                            >
                                <span className="inline-flex items-center text-cyan-400">
                                    NTM EPS
                                    <SortArrow active={sortKey === 'ntmEps'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={headerClass('gapRatio')}
                                onClick={() => handleSort('gapRatio')}
                            >
                                <span className="inline-flex items-center text-purple-400">
                                    GAP
                                    <SortArrow active={sortKey === 'gapRatio'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={headerClass('epsGrowthRate')}
                                onClick={() => handleSort('epsGrowthRate')}
                            >
                                <span className="inline-flex items-center">
                                    GROWTH
                                    <SortArrow active={sortKey === 'epsGrowthRate'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={`${headerClass('peg')} hidden lg:table-cell`}
                                onClick={() => handleSort('peg')}
                            >
                                <span className="inline-flex items-center">
                                    PEG
                                    <SortArrow active={sortKey === 'peg'} order={sortOrder} />
                                </span>
                            </th>
                            <th className="px-3 py-4 text-right font-semibold text-slate-400 text-[11px] hidden lg:table-cell">
                                TTM P/E
                            </th>
                            <th className="px-3 py-4 text-right font-semibold text-cyan-400 text-[11px] hidden xl:table-cell">
                                FWD P/E
                            </th>
                            <th
                                className={headerClass('price')}
                                onClick={() => handleSort('price')}
                            >
                                <span className="inline-flex items-center">
                                    PRICE
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
                                    <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                        {stock.ticker}
                                    </span>
                                    <span className="block text-xs text-slate-500 xl:hidden truncate max-w-[100px]">
                                        {stock.name}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-slate-400 hidden xl:table-cell max-w-[150px] truncate text-xs">
                                    {stock.name}
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`font-bold font-mono px-2 py-1 rounded text-sm ${getGripScoreColor(stock.gripScore)}`}>
                                        {stock.gripScore?.toFixed(1) ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs text-white">
                                    ${stock.ttmEps?.toFixed(2) ?? '—'}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs text-cyan-400">
                                    ${stock.ntmEps?.toFixed(2) ?? '—'}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs">
                                    <span className={stock.gapRatio && stock.gapRatio > 1.3 ? 'text-purple-400' : 'text-slate-400'}>
                                        {stock.gapRatio?.toFixed(2) ?? '—'}x
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs">
                                    <span className={stock.epsGrowthRate && stock.epsGrowthRate > 30 ? 'text-emerald-400' : 'text-slate-300'}>
                                        {stock.epsGrowthRate?.toFixed(1) ?? '—'}%
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs hidden lg:table-cell">
                                    <span className={stock.peg && stock.peg < 1.5 ? 'text-emerald-400' : 'text-slate-400'}>
                                        {stock.peg?.toFixed(2) ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs text-slate-400 hidden lg:table-cell">
                                    {stock.ttmEps > 0 && stock.ttmEps < stock.price && stock.price ? (stock.price / stock.ttmEps).toFixed(1) : '—'}x
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs text-cyan-400 hidden xl:table-cell">
                                    {stock.ntmEps > 0 && stock.ntmEps < stock.price && stock.price ? (stock.price / stock.ntmEps).toFixed(1) : '—'}x
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
