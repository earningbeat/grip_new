'use client';

import { useState, useMemo } from 'react';
import { StockData } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface HighBetaTableProps {
    data: StockData[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

type SortKey = 'tGripScore' | 'price' | 'marketCap' | 'revenue' | 'evRevenue' | 'psr' | 'cagr3Y' | 'ruleOf40' | 'ttmEps' | 'ntmEps' | 'absoluteGapRatio' | 'freeCashFlow' | 'cashAndShortTermInvestments' | 'cashRunwayQuarters';
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

// T-GRIP Score 색상 (0-10점)
function getTGripColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
    if (score >= 6) return 'text-orange-400 bg-orange-500/10 border border-orange-500/20';
    if (score >= 4) return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20';
    return 'text-slate-400 bg-slate-800/50 border border-slate-700/50';
}

function SortArrow({ active, order }: { active: boolean; order: SortOrder }) {
    return (
        <span className={`ml-1 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
            {order === 'desc' ? '↓' : '↑'}
        </span>
    );
}

export default function HighBetaTable({ data, isLoading, onSelectStock }: HighBetaTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('tGripScore');
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
        px-3 py-4 text-right font-semibold text-[10px] uppercase tracking-wider
        ${sortKey === key ? 'text-amber-400' : 'text-slate-500'}
    `;

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-12 bg-amber-900/20 rounded-lg mb-2" />
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-800/30 rounded-lg mb-1" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-20 text-slate-400">
                <p className="text-lg font-medium tracking-tight">턴어라운드 후보 없음</p>
                <p className="text-[10px] mt-1 font-mono uppercase tracking-[0.2em] opacity-50">TTM EPS ( - ) &rarr; NTM EPS ( + )</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-xl border border-amber-500/20 bg-slate-900/50 backdrop-blur-sm">
            <table className="w-full text-[11px] whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-slate-900">
                    <tr className="border-b border-amber-500/20 bg-amber-500/5">
                        <th className="px-3 py-4 text-left font-semibold text-slate-500 w-10">#</th>
                        <th className="px-3 py-4 text-left font-semibold text-slate-300 min-w-[100px]">TICKER</th>
                        <th className="px-3 py-4 text-left font-semibold text-slate-500 min-w-[150px]">NAME</th>
                        <th className="px-3 py-4 text-left font-semibold text-slate-600 hidden xl:table-cell">SECTOR</th>

                        <th className={headerClass('tGripScore').replace('text-right', 'text-center')} onClick={() => handleSort('tGripScore')}>
                            T-GRIP <SortArrow active={sortKey === 'tGripScore'} order={sortOrder} />
                        </th>

                        <th className={headerClass('price')} onClick={() => handleSort('price')}>
                            PRICE <SortArrow active={sortKey === 'price'} order={sortOrder} />
                        </th>

                        <th className={headerClass('marketCap')} onClick={() => handleSort('marketCap')}>
                            MCAP <SortArrow active={sortKey === 'marketCap'} order={sortOrder} />
                        </th>

                        <th className={headerClass('revenue')} onClick={() => handleSort('revenue')}>
                            REV (TTM) <SortArrow active={sortKey === 'revenue'} order={sortOrder} />
                        </th>

                        <th className={headerClass('evRevenue')} onClick={() => handleSort('evRevenue')}>
                            EV/REV <SortArrow active={sortKey === 'evRevenue'} order={sortOrder} />
                        </th>

                        <th className={headerClass('psr')} onClick={() => handleSort('psr')}>
                            PSR <SortArrow active={sortKey === 'psr'} order={sortOrder} />
                        </th>

                        <th className={headerClass('cagr3Y')} onClick={() => handleSort('cagr3Y')}>
                            REV CAGR <SortArrow active={sortKey === 'cagr3Y'} order={sortOrder} />
                        </th>

                        <th className={headerClass('ruleOf40')} onClick={() => handleSort('ruleOf40')}>
                            RULE40 <SortArrow active={sortKey === 'ruleOf40'} order={sortOrder} />
                        </th>

                        <th className={headerClass('ttmEps')} onClick={() => handleSort('ttmEps')}>
                            TTM EPS <SortArrow active={sortKey === 'ttmEps'} order={sortOrder} />
                        </th>

                        <th className={headerClass('ntmEps')} onClick={() => handleSort('ntmEps')}>
                            NTM EPS <SortArrow active={sortKey === 'ntmEps'} order={sortOrder} />
                        </th>

                        <th className={headerClass('absoluteGapRatio')} onClick={() => handleSort('absoluteGapRatio')}>
                            GAP <SortArrow active={sortKey === 'absoluteGapRatio'} order={sortOrder} />
                        </th>

                        <th className={headerClass('freeCashFlow')} onClick={() => handleSort('freeCashFlow')}>
                            CASHFLOW <SortArrow active={sortKey === 'freeCashFlow'} order={sortOrder} />
                        </th>

                        <th className={headerClass('cashAndShortTermInvestments')} onClick={() => handleSort('cashAndShortTermInvestments')}>
                            CASH <SortArrow active={sortKey === 'cashAndShortTermInvestments'} order={sortOrder} />
                        </th>

                        <th className={headerClass('cashRunwayQuarters')} onClick={() => handleSort('cashRunwayQuarters')}>
                            RUNWAY <SortArrow active={sortKey === 'cashRunwayQuarters'} order={sortOrder} />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((stock, index) => (
                        <tr
                            key={stock.ticker}
                            onClick={() => onSelectStock?.(stock)}
                            className="border-b border-slate-800/50 hover:bg-amber-500/5 transition-colors group cursor-pointer"
                        >
                            <td className="px-3 py-3 text-slate-600 font-mono text-[10px]">{index + 1}</td>
                            <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5">
                                    <ExchangeBadge exchange={stock.exchange} />
                                    <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                                        {stock.ticker}
                                    </span>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-slate-400 truncate max-w-[150px] font-medium leading-none">
                                {stock.name}
                            </td>
                            <td className="px-3 py-3 text-slate-600 hidden xl:table-cell truncate max-w-[100px]">
                                {stock.sector}
                            </td>
                            <td className="px-3 py-3 text-center">
                                <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${getTGripColor(stock.tGripScore)}`}>
                                    {stock.tGripScore?.toFixed(1) ?? '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-white">
                                ${formatNumber(stock.price)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-400">
                                {formatMarketCap(stock.marketCap)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-400">
                                {formatMarketCap(stock.revenue)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-cyan-400">
                                {stock.evRevenue ? stock.evRevenue.toFixed(1) + 'x' : '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-300">
                                {stock.psr ? stock.psr.toFixed(1) + 'x' : '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono">
                                <span className={(stock.cagr3Y ?? 0) > 30 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                                    {stock.cagr3Y !== null ? formatPercent(stock.cagr3Y / 100) : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-emerald-400">
                                {stock.ruleOf40 ? stock.ruleOf40.toFixed(0) : '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-rose-400">
                                {stock.ttmEps?.toFixed(2) ?? '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-emerald-400">
                                {stock.ntmEps?.toFixed(2) ?? '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-purple-400 font-bold">
                                {stock.absoluteGapRatio?.toFixed(2) ?? '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-400">
                                {formatMarketCap(stock.freeCashFlow)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-400">
                                {formatMarketCap(stock.cashAndShortTermInvestments)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono">
                                <span className={(stock.cashRunwayQuarters ?? 0) < 4 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                                    {stock.cashRunwayQuarters !== null ? (stock.cashRunwayQuarters >= 50 ? '∞' : `${stock.cashRunwayQuarters.toFixed(0)}Q`) : '—'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
