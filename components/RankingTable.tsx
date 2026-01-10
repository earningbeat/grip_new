'use client';

import { useState, useMemo } from 'react';
import { StockData, getGripGrade } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface RankingTableProps {
    data: StockData[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

type SortKey = 'gripScore' | 'pegScore' | 'gapScore' | 'price' | 'epsGrowthRate' | 'gapRatio' | 'marketCap';
type SortOrder = 'asc' | 'desc';

// GRIP Score 색상 (0-10점)
function getGripScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-emerald-400 bg-emerald-500/20';
    if (score >= 6) return 'text-cyan-400 bg-cyan-500/20';
    if (score >= 4) return 'text-blue-400 bg-blue-500/20';
    if (score >= 2) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-slate-400 bg-slate-700/50';
}

// 개별 점수 색상 (0-5점)
function getScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 4) return 'text-emerald-400';
    if (score >= 3) return 'text-cyan-400';
    if (score >= 2) return 'text-yellow-400';
    return 'text-slate-400';
}

// 정렬 화살표 컴포넌트
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
                <p className="text-sm mt-1">스캔 완료 후 새로고침해주세요</p>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-2">
                {sortedData.map((stock, index) => (
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
                                <p className="text-slate-600">PEG</p>
                                <p className={getScoreColor(stock.pegScore)}>{stock.pegScore?.toFixed(1) ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-slate-600">GAP</p>
                                <p className={getScoreColor(stock.gapScore)}>{stock.gapScore?.toFixed(1) ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-slate-600">Growth</p>
                                <p className={stock.epsGrowthRate && stock.epsGrowthRate > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                                    {stock.epsGrowthRate ? `${stock.epsGrowthRate.toFixed(0)}%` : '—'}
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
                            <th className="px-3 py-4 text-left font-semibold text-slate-300">#</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-300">Ticker</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-300 hidden xl:table-cell">Name</th>
                            <th
                                className={`px-3 py-4 text-center font-semibold ${headerClass('gripScore')}`}
                                onClick={() => handleSort('gripScore')}
                            >
                                <span className="inline-flex items-center gap-1 text-cyan-400" title="GRIP Score (0-10)">
                                    GRIP Score
                                    <SortArrow active={sortKey === 'gripScore'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={`px-3 py-4 text-right font-semibold hidden lg:table-cell ${headerClass('pegScore')}`}
                                onClick={() => handleSort('pegScore')}
                                title="PEG Score (0-5)"
                            >
                                <span className="inline-flex items-center text-emerald-400">
                                    PEG Score
                                    <SortArrow active={sortKey === 'pegScore'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={`px-3 py-4 text-right font-semibold hidden lg:table-cell ${headerClass('gapScore')}`}
                                onClick={() => handleSort('gapScore')}
                                title="Gap Score (0-5)"
                            >
                                <span className="inline-flex items-center text-blue-400">
                                    Gap Score
                                    <SortArrow active={sortKey === 'gapScore'} order={sortOrder} />
                                </span>
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
                            <th
                                className={`px-3 py-4 text-right font-semibold hidden md:table-cell ${headerClass('epsGrowthRate')}`}
                                onClick={() => handleSort('epsGrowthRate')}
                            >
                                <span className="inline-flex items-center">
                                    EPS Growth
                                    <SortArrow active={sortKey === 'epsGrowthRate'} order={sortOrder} />
                                </span>
                            </th>
                            <th
                                className={`px-3 py-4 text-right font-semibold hidden xl:table-cell ${headerClass('gapRatio')}`}
                                onClick={() => handleSort('gapRatio')}
                            >
                                <span className="inline-flex items-center text-purple-400">
                                    Gap Ratio
                                    <SortArrow active={sortKey === 'gapRatio'} order={sortOrder} />
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((stock, index) => (
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
                                        {!stock.isQualityGrowth && (
                                            <span className="text-amber-400" title={stock.epsWarnings?.join(', ') || 'EPS 품질 주의'}>⚠</span>
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
                                <td className="px-3 py-3 text-right font-mono hidden lg:table-cell">
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
                                <td className="px-3 py-3 text-right font-mono text-xs hidden xl:table-cell">
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
        </>
    );
}
