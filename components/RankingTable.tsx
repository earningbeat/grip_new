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

// 개별 점수 색상 (1-10점)
function getScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-emerald-400';
    if (score >= 6) return 'text-cyan-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-slate-400';
}

// 정렬 화살표 컴포넌트
function SortArrow({ active, order }: { active: boolean; order: SortOrder }) {
    return (
        <span className={`ml-1 transition-all duration-300 ${active ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-40 group-hover:scale-100'}`}>
            {order === 'desc' ? '↓' : '↑'}
        </span>
    );
}

export default function RankingTable({ data, isLoading, onSelectStock }: RankingTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('gripScore');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // 정렬된 데이터
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const aVal = a[sortKey] ?? -Infinity;
            const bVal = b[sortKey] ?? -Infinity;
            return sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
        });
    }, [data, sortKey, sortOrder]);

    // 정렬 핸들러
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    // 헤더 버튼 스타일
    const headerClass = (key: SortKey) => `
    px-4 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer select-none group hover:bg-slate-800/50 transition-all
    ${sortKey === key ? 'text-white bg-slate-800/30' : 'text-slate-500'}
  `;

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
                <p className="text-xl font-medium text-slate-400">데이터가 존재하지 않습니다</p>
                <p className="text-slate-500 mt-2">백데이터 수집이 완료될 때까지 기다려 주세요.</p>
            </div>
        );
    }

    return (
        <div className="relative group/table overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950/40 border-b border-slate-800">
                            <th className="px-4 py-4 text-xs font-bold text-slate-600 w-12 text-center">RANK</th>
                            <th className="px-4 py-4 text-xs font-bold text-slate-300 min-w-[120px]">TICKER</th>

                            <th className={headerClass('gripScore')} onClick={() => handleSort('gripScore')}>
                                <span className="flex items-center gap-1.5">
                                    GRIP SCORE
                                    <SortArrow active={sortKey === 'gripScore'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={`${headerClass('marketCap')} hidden lg:table-cell`} onClick={() => handleSort('marketCap')}>
                                <span className="flex items-center">
                                    MKT CAP
                                    <SortArrow active={sortKey === 'marketCap'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={`${headerClass('epsGrowthRate')} text-right`} onClick={() => handleSort('epsGrowthRate')}>
                                <span className="flex items-center justify-end">
                                    GROWTH
                                    <SortArrow active={sortKey === 'epsGrowthRate'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={`${headerClass('gapRatio')} text-right hidden md:table-cell`} onClick={() => handleSort('gapRatio')}>
                                <span className="flex items-center justify-end">
                                    GAP RATIO
                                    <SortArrow active={sortKey === 'gapRatio'} order={sortOrder} />
                                </span>
                            </th>

                            <th className="px-4 py-4 text-xs font-bold text-slate-500 text-right hidden xl:table-cell">MARGINS(G/O)</th>
                            <th className="px-4 py-4 text-xs font-bold text-slate-500 text-right hidden xl:table-cell">RUNWAY</th>
                            <th className={`${headerClass('price')} text-right`} onClick={() => handleSort('price')}>
                                <span className="flex items-center justify-end">
                                    PRICE
                                    <SortArrow active={sortKey === 'price'} order={sortOrder} />
                                </span>
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
                                <td className="px-4 py-5 text-center font-mono text-slate-600 text-xs">
                                    {index + 1}
                                </td>
                                <td className="px-4 py-5">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                                                {stock.ticker}
                                            </span>
                                            {stock.beta && stock.beta > 1.5 && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold border border-red-500/20">HB</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500 truncate max-w-[120px] font-medium uppercase tracking-tight">
                                            {stock.name}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-4 py-5 font-mono">
                                    <div className="flex flex-col gap-1">
                                        <span className={`inline-block px-2 py-1 rounded-lg border text-sm font-black text-center ${getGripScoreColor(stock.gripScore)}`}>
                                            {stock.gripScore ? stock.gripScore.toFixed(1) : '—'}
                                        </span>
                                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500"
                                                style={{ width: `${Math.min(100, (stock.gripScore || 0) * 5)}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>

                                <td className="px-4 py-5 text-slate-400 text-xs font-semibold hidden lg:table-cell">
                                    {formatMarketCap(stock.marketCap)}
                                </td>

                                <td className="px-4 py-5 text-right font-mono text-xs">
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${stock.epsGrowthRate && stock.epsGrowthRate > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {stock.epsGrowthRate ? `${stock.epsGrowthRate.toFixed(1)}%` : '—'}
                                        </span>
                                        <span className="text-[9px] text-slate-600 uppercase">YoY Exp.</span>
                                    </div>
                                </td>

                                <td className="px-4 py-5 text-right font-mono text-xs hidden md:table-cell">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stock.gapRatio && stock.gapRatio > 1.5 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                        {stock.gapRatio ? stock.gapRatio.toFixed(2) : '—'}x
                                    </span>
                                </td>

                                <td className="px-4 py-5 text-right font-mono text-[10px] hidden xl:table-cell">
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-slate-300 font-bold">{stock.grossMargin ? formatPercent(stock.grossMargin, 1) : '—'}</span>
                                        <span className="text-slate-500">{stock.operatingMargin ? formatPercent(stock.operatingMargin, 1) : '—'}</span>
                                    </div>
                                </td>

                                <td className="px-4 py-5 text-right font-mono text-xs hidden xl:table-cell">
                                    <span className={`font-bold ${stock.cashRunwayQuarters && stock.cashRunwayQuarters < 4 ? 'text-amber-500' : 'text-slate-400'}`}>
                                        {stock.cashRunwayQuarters ? `${stock.cashRunwayQuarters.toFixed(1)}Q` : '∞'}
                                    </span>
                                </td>

                                <td className="px-4 py-5 text-right font-mono text-xs font-bold text-white">
                                    ${formatNumber(stock.price)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* UI Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent pointer-events-none" />
        </div>
    );
}
