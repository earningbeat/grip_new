import { useState, useMemo } from 'react';
import { StockData } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';
import TrendChartPopover from './TrendChartPopover';
import FormulaPopover from './FormulaPopover';

interface RankingTableProps {
    data: StockData[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

type SortKey = 'gripScore' | 'price' | 'marketCap' | 'revenue' | 'cagr3Y' | 'peg' | 'ttmPe' | 'forwardPe' | 'gapRatio';
type SortOrder = 'asc' | 'desc';

interface FormulaInfo {
    title: string;
    formula: string;
    description: string;
}

const FORMULAS: Record<string, FormulaInfo> = {
    gripScore: {
        title: "GRIP Score",
        formula: "PEG Score (0-5) + GAP Score (0-5)",
        description: "Value-Growth composite score. Combines valuation efficiency (PEG) with future earnings momentum (GAP). 10 is perfect."
    },
    price: {
        title: "Price",
        formula: "Real-time Exchange Quote",
        description: "Current trading price. Checked for sanity against TTM EPS to ensure data realism."
    },
    marketCap: {
        title: "Market Cap",
        formula: "Price × Shares Outstanding",
        description: "Total market value. Used to filter out micro-cap 'ghost' tickers."
    },
    revenue: {
        title: "Revenue (TTM)",
        formula: "Sum of Last 4 Quarters",
        description: "Trailing 12-month total sales. The base for growth and margin calculations."
    },
    cagr3Y: {
        title: "3Y CAGR",
        formula: "((Rev[Now] / Rev[3Y Ago]) ^ (1/3)) - 1",
        description: "Annualized revenue growth. Essential for identifying consistent compounders."
    },
    peg: {
        title: "PEG Ratio",
        formula: "TTM P/E / 3Y Historical Revenue Growth",
        description: "Adjusts P/E for growth. 1.0 is fair; below 1.0 suggests the stock is cheap relative to its growth rate."
    },
    gapRatio: {
        title: "GAP Ratio",
        formula: "NTM EPS / TTM EPS",
        description: "Forward earnings momentum indicator. A ratio > 1.0 means earnings are expected to grow next year."
    }
};

// Exchange Badge
function ExchangeBadge({ exchange }: { exchange?: string }) {
    if (!exchange) return null;
    const ex = exchange.toUpperCase();
    const isNasdaq = ex.includes('NASDAQ') || ex === 'NGS' || ex === 'NGM' || ex === 'NCM';
    const isNyse = ex.includes('NYSE') || ex === 'NYQ' || ex === 'NYS';

    if (!isNasdaq && !isNyse) return null;

    return (
        <span className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-black tracking-tighter border ${isNasdaq
            ? 'bg-blue-50 text-blue-600 border-blue-200'
            : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
            {isNasdaq ? 'NASDAQ' : 'NYSE'}
        </span>
    );
}

// GRIP Score 색상 (0-10점)
function getGripScoreColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
    if (score >= 6) return 'text-cyan-700 bg-cyan-50 border border-cyan-200';
    if (score >= 4) return 'text-amber-700 bg-amber-50 border border-amber-200';
    return 'text-slate-600 bg-slate-100 border border-slate-200';
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
    const [activeTrend, setActiveTrend] = useState<{ stock: StockData; metric: string; label: string } | null>(null);
    const [activeFormula, setActiveFormula] = useState<FormulaInfo | null>(null);

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
        cursor-pointer select-none group hover:text-slate-900 transition-colors
        px-3 py-4 text-right font-semibold text-[13px] uppercase tracking-wide
        ${sortKey === key ? 'text-blue-600' : 'text-slate-500'}
    `;

    if (isLoading) {
        return (
            <div className="animate-fade-in space-y-2">
                <div className="h-12 bg-slate-50 border border-slate-100 rounded-lg" />
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-14 bg-white border border-slate-50 rounded-lg" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
                <p className="text-[18px] font-medium text-slate-400">데이터가 없습니다</p>
                <p className="text-[13px] mt-1 font-bold uppercase tracking-widest text-slate-300">No matching stocks found</p>
            </div>
        );
    }

    return (
        <>
            {/* Formula Popover */}
            {activeFormula && (
                <FormulaPopover
                    title={activeFormula.title}
                    formula={activeFormula.formula}
                    description={activeFormula.description}
                    onClose={() => setActiveFormula(null)}
                />
            )}

            {/* Trend Popover Rendering */}
            {activeTrend && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto">
                        <TrendChartPopover
                            stock={activeTrend.stock}
                            metric={activeTrend.metric}
                            label={activeTrend.label}
                            onClose={() => setActiveTrend(null)}
                        />
                    </div>
                </div>
            )}

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
                                    <span className="text-[13px] text-slate-600 font-mono">#{index + 1}</span>
                                    <span className="font-black text-white text-[18px]">{stock.ticker}</span>
                                </div>
                                <p className="text-[13px] text-slate-500 truncate max-w-[200px] font-medium leading-none mt-1">{stock.name}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2.5 py-1 rounded text-[14px] font-black ${getGripScoreColor(stock.gripScore)}`}>
                                    {stock.gripScore?.toFixed(1) ?? '—'}
                                </span>
                                <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-tighter">GRIP CORE</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[13px]">
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

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[70vh] rounded-2xl border border-slate-200 bg-white shadow-sm glow-emerald">
                <table className="w-full text-[18px] border-collapse min-w-[1240px]">
                    <thead className="sticky top-0 z-20 bg-white/95 backdrop-blur-md">
                        <tr className="border-b border-slate-100">
                            <th className="px-3 py-6 text-left font-black text-slate-400 text-[13px] w-12 tracking-widest pl-6 uppercase">#</th>
                            <th className="px-3 py-6 text-left font-black text-slate-900 text-[13px] w-28 tracking-widest uppercase">Ticker</th>
                            <th className="px-3 py-6 text-left font-black text-slate-400 text-[13px] min-w-[180px] tracking-widest uppercase">Company</th>
                            <th className="px-3 py-6 text-left font-black text-slate-400 text-[13px] hidden xl:table-cell tracking-widest uppercase">Sector</th>

                            <th
                                className={headerClass('gripScore').replace('text-right', 'text-center')}
                                onClick={() => handleSort('gripScore')}
                            >
                                <span className="inline-flex items-center text-emerald-600 font-black">
                                    GRIP
                                    <SortArrow active={sortKey === 'gripScore'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.gripScore); }} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('price')} onClick={() => handleSort('price')}>
                                <span className="inline-flex items-center font-black">
                                    PRICE
                                    <SortArrow active={sortKey === 'price'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.price); }} className="ml-1 opacity-20 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('marketCap')} onClick={() => handleSort('marketCap')}>
                                <span className="inline-flex items-center font-black">
                                    MCAP
                                    <SortArrow active={sortKey === 'marketCap'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.marketCap); }} className="ml-1 opacity-20 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('revenue')} onClick={() => handleSort('revenue')}>
                                <span className="inline-flex items-center font-black">
                                    REV
                                    <SortArrow active={sortKey === 'revenue'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.revenue); }} className="ml-1 opacity-20 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('cagr3Y')} onClick={() => handleSort('cagr3Y')}>
                                <span className="inline-flex items-center text-rose-600 font-black">
                                    CAGR
                                    <SortArrow active={sortKey === 'cagr3Y'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.cagr3Y); }} className="ml-1 opacity-20 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('peg')} onClick={() => handleSort('peg')}>
                                <span className="inline-flex items-center text-emerald-600 font-black">
                                    PEG
                                    <SortArrow active={sortKey === 'peg'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.peg); }} className="ml-1 opacity-20 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('ttmPe')} onClick={() => handleSort('ttmPe')}>
                                <span className="inline-flex items-center font-black">
                                    TTM P/E
                                    <SortArrow active={sortKey === 'ttmPe'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('forwardPe')} onClick={() => handleSort('forwardPe')}>
                                <span className="inline-flex items-center text-blue-600 font-black">
                                    FWD P/E
                                    <SortArrow active={sortKey === 'forwardPe'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('gapRatio')} onClick={() => handleSort('gapRatio')}>
                                <span className="inline-flex items-center text-purple-600 font-black">
                                    GAP
                                    <SortArrow active={sortKey === 'gapRatio'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.gapRatio); }} className="ml-1 opacity-20 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map((stock, index) => (
                            <tr
                                key={stock.ticker}
                                className="hover:bg-slate-50/50 transition-colors group cursor-default"
                            >
                                <td className="px-3 py-5 text-slate-400 font-bold text-[13px] pl-6">{index + 1}</td>
                                <td className="px-3 py-5">
                                    <div className="flex items-center gap-2 min-w-[120px]">
                                        <ExchangeBadge exchange={stock.exchange} />
                                        <span
                                            onClick={() => onSelectStock?.(stock)}
                                            className="font-black text-slate-900 cursor-pointer hover:text-emerald-600 transition-colors text-[16px]"
                                        >
                                            {stock.ticker}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-5 text-slate-500 truncate max-w-[200px] text-[14px] font-bold">
                                    {stock.name}
                                </td>
                                <td className="px-3 py-5 text-slate-400 text-[13px] hidden xl:table-cell truncate max-w-[120px] font-bold uppercase tracking-tighter">
                                    {stock.sector || '—'}
                                </td>
                                <td className="px-3 py-5 text-center">
                                    <span className={`font-black font-mono px-3 py-1.5 rounded-full text-[13px] ${getGripScoreColor(stock.gripScore)}`}>
                                        {stock.gripScore?.toFixed(1) ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-5 text-right font-mono text-[14px] text-slate-900 font-bold">
                                    <span
                                        className="cursor-pointer hover:underline decoration-emerald-200 decoration-2 underline-offset-4"
                                        onClick={() => setActiveTrend({ stock, metric: 'price', label: 'Price' })}
                                    >
                                        ${formatNumber(stock.price)}
                                    </span>
                                </td>
                                <td className="px-3 py-5 text-right font-mono text-[13px] text-slate-400 font-bold">
                                    {formatMarketCap(stock.marketCap)}
                                </td>
                                <td className="px-3 py-5 text-right font-mono text-[13px] text-slate-400 font-bold">
                                    {formatMarketCap(stock.revenue)}
                                </td>
                                <td className="px-3 py-5 text-right font-mono text-[14px]">
                                    <span
                                        className={`cursor-pointer hover:underline decoration-rose-200 decoration-2 underline-offset-4 font-black ${Number(stock.cagr3Y) > 20 ? 'text-rose-600' : 'text-slate-500'}`}
                                        onClick={() => setActiveTrend({ stock, metric: 'revenue', label: 'Rev CAGR' })}
                                    >
                                        {stock.cagr3Y ? formatPercent(stock.cagr3Y / 100) : '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-5 text-right font-mono text-[14px]">
                                    <span
                                        className={`cursor-pointer hover:underline decoration-emerald-200 decoration-2 underline-offset-4 font-black ${(stock.peg ?? 0) < 1 ? 'text-emerald-600' : 'text-slate-500'}`}
                                        onClick={() => setActiveTrend({ stock, metric: 'eps', label: 'EPS Trend' })}
                                    >
                                        {stock.peg?.toFixed(2) ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-5 text-right font-mono text-[14px] text-slate-500 font-bold">
                                    {stock.ttmPe?.toFixed(1) ?? '—'}x
                                </td>
                                <td className="px-3 py-5 text-right font-mono text-[14px] text-blue-600 font-black">
                                    {stock.forwardPe?.toFixed(1) ?? '—'}x
                                </td>
                                <td className="px-3 py-5 text-right font-mono text-[14px]">
                                    <span
                                        className={`cursor-pointer hover:underline decoration-purple-200 decoration-2 underline-offset-4 font-black ${(stock.gapRatio ?? 0) > 1.5 ? 'text-purple-600' : 'text-slate-500'}`}
                                        onClick={() => setActiveTrend({ stock, metric: 'netMargin', label: 'Margin Trend' })}
                                    >
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
