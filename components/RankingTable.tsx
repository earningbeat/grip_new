'use client';

import { useState, useMemo } from 'react';
import { StockData } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface RankingTableProps {
    data: StockData[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

type SortKey = 'gripScore' | 'price' | 'marketCap' | 'revenue' | 'cagr3Y' | 'peg' | 'ttmPe' | 'forwardPe' | 'gapRatio';
type SortOrder = 'asc' | 'desc';

// Exchange Badge
function ExchangeBadge({ exchange }: { exchange?: string }) {
    if (!exchange) return null;
    const ex = exchange.toUpperCase();
    const isNasdaq = ex.includes('NASDAQ') || ex === 'NGS' || ex === 'NGM' || ex === 'NCM';
    const isNyse = ex.includes('NYSE') || ex === 'NYQ' || ex === 'NYS';

    if (!isNasdaq && !isNyse) return null;

    return (
        <span className={`px-1 py-0.5 rounded-[2px] text-[7px] font-black tracking-tighter border ${isNasdaq
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
            {isNasdaq ? 'NASDAQ' : 'NYSE'}
        </span>
    );
}

// GRIP Score 색상 (0-10점)
function getGripScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
    if (score >= 6) return 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20';
    if (score >= 4) return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20';
    return 'text-slate-400 bg-slate-800/50 border border-slate-700/50';
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
        return [...data].sort((a, b) => {
            const aVal = (a as any)[sortKey] ?? -Infinity;
            const bVal = (b as any)[sortKey] ?? -Infinity;
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
        px-3 py-4 text-right font-semibold text-[10px] uppercase tracking-wide
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
                <p className="text-lg font-medium tracking-tight">데이터가 없습니다</p>
                <p className="text-xs mt-1 font-bold uppercase tracking-widest opacity-30">No matching stocks found</p>
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
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-600 font-mono">#{index + 1}</span>
                                    <span className="font-black text-white">{stock.ticker}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate max-w-[150px] font-medium leading-none mt-1">{stock.name}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-black ${getGripScoreColor(stock.gripScore)}`}>
                                    {stock.gripScore?.toFixed(1) ?? '—'}
                                </span>
                                <p className="text-[8px] text-slate-600 font-bold mt-1 uppercase tracking-tighter">GRIP CORE</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div>
                                <p className="text-slate-600 font-bold uppercase tracking-tighter">Price</p>
                                <p className="text-white font-bold">${formatNumber(stock.price)}</p>
                            </div>
                            <div>
                                <p className="text-slate-600 font-bold uppercase tracking-tighter">CAGR</p>
                                <p className="text-rose-400 font-bold">{(stock.cagr3Y ?? 0).toFixed(1)}%</p>
                            </div>
                            <div>
                                <p className="text-slate-600 font-bold uppercase tracking-tighter">GAP</p>
                                <p className="text-purple-400 font-bold">{stock.gapRatio?.toFixed(2)}x</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[70vh] rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-900">
                        <tr className="border-b border-slate-700/50">
                            <th className="px-3 py-4 text-left font-semibold text-slate-400 text-[10px] w-10">#</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-300 text-[10px] w-20">TICKER</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-400 text-[10px] min-w-[120px]">NAME</th>
                            <th className="px-3 py-4 text-left font-semibold text-slate-500 text-[10px] hidden xl:table-cell">SECTOR</th>

                            <th
                                className={headerClass('gripScore').replace('text-right', 'text-center')}
                                onClick={() => handleSort('gripScore')}
                            >
                                <span className="inline-flex items-center text-emerald-400">
                                    GRIP
                                    <SortArrow active={sortKey === 'gripScore'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('price')} onClick={() => handleSort('price')}>
                                <span className="inline-flex items-center">
                                    PRICE
                                    <SortArrow active={sortKey === 'price'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('marketCap')} onClick={() => handleSort('marketCap')}>
                                <span className="inline-flex items-center">
                                    MCAP
                                    <SortArrow active={sortKey === 'marketCap'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('revenue')} onClick={() => handleSort('revenue')}>
                                <span className="inline-flex items-center">
                                    REV
                                    <SortArrow active={sortKey === 'revenue'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('cagr3Y')} onClick={() => handleSort('cagr3Y')}>
                                <span className="inline-flex items-center text-rose-400">
                                    CAGR
                                    <SortArrow active={sortKey === 'cagr3Y'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('peg')} onClick={() => handleSort('peg')}>
                                <span className="inline-flex items-center text-emerald-400">
                                    PEG
                                    <SortArrow active={sortKey === 'peg'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('ttmPe')} onClick={() => handleSort('ttmPe')}>
                                <span className="inline-flex items-center">
                                    TTM P/E
                                    <SortArrow active={sortKey === 'ttmPe'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('forwardPe')} onClick={() => handleSort('forwardPe')}>
                                <span className="inline-flex items-center text-cyan-400">
                                    FWD P/E
                                    <SortArrow active={sortKey === 'forwardPe'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('gapRatio')} onClick={() => handleSort('gapRatio')}>
                                <span className="inline-flex items-center text-purple-400">
                                    GAP
                                    <SortArrow active={sortKey === 'gapRatio'} order={sortOrder} />
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
                                <td className="px-3 py-3 text-slate-500 font-mono text-[10px]">{index + 1}</td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center gap-1.5 min-w-[100px]">
                                        <ExchangeBadge exchange={stock.exchange} />
                                        <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                            {stock.ticker}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-slate-400 truncate max-w-[150px] text-[11px] font-medium leading-none">
                                    {stock.name}
                                </td>
                                <td className="px-3 py-3 text-slate-500 text-[10px] hidden xl:table-cell truncate max-w-[100px]">
                                    {stock.sector || '—'}
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`font-bold font-mono px-2 py-1 rounded text-xs ${getGripScoreColor(stock.gripScore)}`}>
                                        {stock.gripScore?.toFixed(1) ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-[11px] text-white">
                                    ${formatNumber(stock.price)}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-[11px] text-slate-400">
                                    {formatMarketCap(stock.marketCap)}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-[11px] text-slate-400">
                                    {formatMarketCap(stock.revenue)}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-[11px]">
                                    <span className={Number(stock.cagr3Y) > 20 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                                        {stock.cagr3Y ? formatPercent(stock.cagr3Y / 100) : '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-[11px]">
                                    <span className={stock.peg < 1 ? 'text-emerald-400' : 'text-slate-400'}>
                                        {stock.peg?.toFixed(2) ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs text-slate-400">
                                    {stock.ttmPe?.toFixed(1) ?? '—'}x
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-xs text-cyan-400">
                                    {stock.forwardPe?.toFixed(1) ?? '—'}x
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-[11px]">
                                    <span className={stock.gapRatio > 1.5 ? 'text-purple-400 font-bold' : 'text-slate-400'}>
                                        {stock.gapRatio?.toFixed(2) ?? '—'}x
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
