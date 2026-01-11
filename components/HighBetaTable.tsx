import { useState, useMemo } from 'react';
import { StockData } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';
import TrendChartPopover from './TrendChartPopover';
import FormulaPopover from './FormulaPopover';

interface HighBetaTableProps {
    data: StockData[];
    isLoading?: boolean;
    onSelectStock?: (stock: StockData) => void;
}

type SortKey = 'tGripScore' | 'price' | 'marketCap' | 'revenue' | 'evRevenue' | 'evGrossProfit' | 'grossMargin' | 'psr' | 'cagr3Y' | 'ruleOf40' | 'ttmEps' | 'ntmEps' | 'absoluteGapRatio' | 'freeCashFlow' | 'burnRate' | 'cashAndShortTermInvestments' | 'cashRunwayQuarters';
type SortOrder = 'asc' | 'desc';

interface FormulaInfo {
    title: string;
    formula: string;
    description: string;
}

const FORMULAS: Record<string, FormulaInfo> = {
    tGripScore: {
        title: "T-GRIP Score",
        formula: "Turnaround Momentum + Cash Runway + EV Multiple",
        description: "Specialized score for high-growth/turnaround stocks. Prioritizes companies reaching profitability while maintaining cash safety."
    },
    evGrossProfit: {
        title: "EV / Gross Profit",
        formula: "Enterprise Value / TTM Gross Profit",
        description: "Standard multiple for growth companies. Ignores non-operating costs to show core business valuation."
    },
    ruleOf40: {
        title: "Rule of 40",
        formula: "Revenue Growth % + Operating Margin %",
        description: "SaaS health indicator. Above 40 means excellent balance between aggressive growth and capital efficiency."
    },
    cashRunwayQuarters: {
        title: "Cash Runway",
        formula: "Total Cash / Quarterly Burn Rate",
        description: "Number of quarters the company can survive without raising new capital at current burn rates."
    },
    absoluteGapRatio: {
        title: "GAP (Momentum)",
        formula: "Future Estimated EPS / Trailing EPS",
        description: "Acceleration metric. Highlights companies transitioning from losses to profitability."
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
        <span className={`px-1 py-0.5 rounded-[2px] text-[7px] font-black tracking-tighter border ${isNasdaq
            ? 'bg-blue-50 text-blue-600 border-blue-200'
            : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
            {isNasdaq ? 'NASDAQ' : 'NYSE'}
        </span>
    );
}

// T-GRIP Score 색상 (0-10점) - Light Mode
function getTGripColor(score: number | null): string {
    if (score === null) return 'text-slate-500';
    if (score >= 8) return 'text-amber-700 bg-amber-50 border border-emerald-200';
    if (score >= 6) return 'text-orange-700 bg-orange-50 border border-orange-200';
    if (score >= 4) return 'text-amber-800 bg-yellow-50 border border-yellow-200';
    return 'text-slate-600 bg-slate-100 border border-slate-200';
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
        px-3 py-4 text-right font-semibold text-[10px] uppercase tracking-wider
        ${sortKey === key ? 'text-amber-700' : 'text-slate-500'}
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
        <div className="relative w-full overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm glow-emerald">
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

            <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
                <table className="w-full text-[11px] whitespace-nowrap border-collapse min-w-[1500px]">
                    <thead className="sticky top-0 z-20 bg-white/95 backdrop-blur-md">
                        <tr className="border-b border-slate-100">
                            <th className="px-3 py-4 text-left font-black text-slate-400 w-12 tracking-widest pl-6 uppercase">#</th>
                            <th className="px-3 py-4 text-left font-black text-slate-900 min-w-[100px] tracking-widest uppercase">Ticker</th>
                            <th className="px-3 py-4 text-left font-black text-slate-400 min-w-[150px] tracking-widest uppercase">Company</th>
                            <th className="px-3 py-4 text-left font-black text-slate-400 hidden xl:table-cell tracking-widest uppercase text-[10px]">Sector</th>

                            <th className={headerClass('tGripScore').replace('text-right', 'text-center')} onClick={() => handleSort('tGripScore')}>
                                <span className="inline-flex items-center text-amber-600 font-black">
                                    T-GRIP
                                    <SortArrow active={sortKey === 'tGripScore'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.tGripScore); }} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('price')} onClick={() => handleSort('price')}>
                                <span className="inline-flex items-center font-black">
                                    PRICE <SortArrow active={sortKey === 'price'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('marketCap')} onClick={() => handleSort('marketCap')}>
                                <span className="inline-flex items-center font-black">
                                    MCAP <SortArrow active={sortKey === 'marketCap'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('revenue')} onClick={() => handleSort('revenue')}>
                                <span className="inline-flex items-center font-black">
                                    REV (TTM) <SortArrow active={sortKey === 'revenue'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('evRevenue')} onClick={() => handleSort('evRevenue')}>
                                <span className="inline-flex items-center font-black">
                                    EV/REV <SortArrow active={sortKey === 'evRevenue'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('evGrossProfit')} onClick={() => handleSort('evGrossProfit')}>
                                <span className="inline-flex items-center text-amber-700 font-black">
                                    EV/GP
                                    <SortArrow active={sortKey === 'evGrossProfit'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.evGrossProfit); }} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('grossMargin')} onClick={() => handleSort('grossMargin')}>
                                <span className="inline-flex items-center text-emerald-700 font-black">
                                    GM% <SortArrow active={sortKey === 'grossMargin'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('psr')} onClick={() => handleSort('psr')}>
                                <span className="inline-flex items-center font-black">
                                    PSR <SortArrow active={sortKey === 'psr'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('cagr3Y')} onClick={() => handleSort('cagr3Y')}>
                                <span className="inline-flex items-center font-black">
                                    REV CAGR <SortArrow active={sortKey === 'cagr3Y'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('ruleOf40')} onClick={() => handleSort('ruleOf40')}>
                                <span className="inline-flex items-center font-black text-pink-600">
                                    RULE40
                                    <SortArrow active={sortKey === 'ruleOf40'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.ruleOf40); }} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('ttmEps')} onClick={() => handleSort('ttmEps')}>
                                <span className="inline-flex items-center font-black">
                                    TTM EPS <SortArrow active={sortKey === 'ttmEps'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('ntmEps')} onClick={() => handleSort('ntmEps')}>
                                <span className="inline-flex items-center font-black">
                                    NTM EPS <SortArrow active={sortKey === 'ntmEps'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('absoluteGapRatio')} onClick={() => handleSort('absoluteGapRatio')}>
                                <span className="inline-flex items-center text-purple-600 font-black">
                                    GAP
                                    <SortArrow active={sortKey === 'absoluteGapRatio'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.absoluteGapRatio); }} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    </button>
                                </span>
                            </th>

                            <th className={headerClass('freeCashFlow')} onClick={() => handleSort('freeCashFlow')}>
                                <span className="inline-flex items-center font-black">
                                    FCF <SortArrow active={sortKey === 'freeCashFlow'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('burnRate')} onClick={() => handleSort('burnRate')}>
                                <span className="inline-flex items-center text-rose-600 font-black">
                                    BURN/M <SortArrow active={sortKey === 'burnRate'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('cashAndShortTermInvestments')} onClick={() => handleSort('cashAndShortTermInvestments')}>
                                <span className="inline-flex items-center font-black text-slate-400">
                                    CASH <SortArrow active={sortKey === 'cashAndShortTermInvestments'} order={sortOrder} />
                                </span>
                            </th>

                            <th className={headerClass('cashRunwayQuarters')} onClick={() => handleSort('cashRunwayQuarters')}>
                                <span className="inline-flex items-center font-black text-slate-400">
                                    RUNWAY
                                    <SortArrow active={sortKey === 'cashRunwayQuarters'} order={sortOrder} />
                                    <button onClick={(e) => { e.stopPropagation(); setActiveFormula(FORMULAS.cashRunwayQuarters); }} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
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
                                <td className="px-3 py-4 text-slate-400 font-bold text-[10px] pl-6 tracking-tighter">{index + 1}</td>
                                <td className="px-3 py-4">
                                    <div className="flex items-center gap-2">
                                        <ExchangeBadge exchange={stock.exchange} />
                                        <span
                                            onClick={() => onSelectStock?.(stock)}
                                            className="font-black text-slate-900 cursor-pointer hover:text-amber-600 transition-colors"
                                        >
                                            {stock.ticker}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-4 text-slate-500 truncate max-w-[150px] font-bold text-[11px]">
                                    {stock.name}
                                </td>
                                <td className="px-3 py-4 text-slate-400 hidden xl:table-cell truncate max-w-[120px] font-bold uppercase tracking-tighter text-[9px]">
                                    {stock.sector}
                                </td>
                                <td className="px-3 py-4 text-center">
                                    <span className={`font-black font-mono px-2 py-1 rounded-full text-[10px] ${getTGripColor(stock.tGripScore)}`}>
                                        {stock.tGripScore?.toFixed(1) ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-slate-900 font-bold">
                                    <span
                                        className="cursor-pointer hover:underline decoration-amber-200 decoration-2 underline-offset-4"
                                        onClick={() => setActiveTrend({ stock, metric: 'price', label: 'Price' })}
                                    >
                                        ${formatNumber(stock.price)}
                                    </span>
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-slate-400 font-bold text-[10px]">
                                    {formatMarketCap(stock.marketCap)}
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-slate-400 font-bold text-[10px]">
                                    {formatMarketCap(stock.revenue)}
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-blue-600 font-black">
                                    {stock.evRevenue ? stock.evRevenue.toFixed(1) + 'x' : '—'}
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-amber-700 font-black">
                                    {stock.evGrossProfit ? stock.evGrossProfit.toFixed(1) + 'x' : '—'}
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-emerald-700 font-black">
                                    {stock.grossMargin ? formatPercent(stock.grossMargin) : '—'}
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-slate-500 font-bold">
                                    {stock.psr ? stock.psr.toFixed(1) + 'x' : '—'}
                                </td>
                                <td className="px-3 py-4 text-right font-mono">
                                    <span
                                        className={`cursor-pointer hover:underline decoration-rose-200 decoration-2 underline-offset-4 font-black text-[11px] ${(stock.cagr3Y ?? 0) > 30 ? 'text-rose-600' : 'text-slate-500'}`}
                                        onClick={() => setActiveTrend({ stock, metric: 'revenue', label: 'Rev CAGR' })}
                                    >
                                        {stock.cagr3Y !== null ? formatPercent(stock.cagr3Y / 100) : '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-emerald-600 font-black">
                                    {stock.ruleOf40 ? stock.ruleOf40.toFixed(0) : '—'}
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-rose-600 font-bold">
                                    <span
                                        className="cursor-pointer hover:underline decoration-rose-200 decoration-2 underline-offset-4"
                                        onClick={() => setActiveTrend({ stock, metric: 'eps', label: 'EPS Trend' })}
                                    >
                                        {stock.ttmEps?.toFixed(2) ?? '—'}
                                    </span>
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-emerald-600 font-black">
                                    {stock.ntmEps?.toFixed(2) ?? '—'}
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-purple-600 font-black">
                                    {stock.absoluteGapRatio?.toFixed(2) ?? '—'}
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-slate-500 font-bold">
                                    <span
                                        className="cursor-pointer hover:underline decoration-blue-200 decoration-2 underline-offset-4"
                                        onClick={() => setActiveTrend({ stock, metric: 'fcf', label: 'FCF Trend' })}
                                    >
                                        {formatNumber(stock.freeCashFlow ?? 0)}
                                    </span>
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-rose-600 font-black">
                                    {stock.burnRate ? formatMarketCap(stock.burnRate) + '/mo' : '—'}
                                </td>
                                <td className="px-3 py-4 text-right font-mono text-slate-400 font-bold text-[10px]">
                                    {formatMarketCap(stock.cashAndShortTermInvestments)}
                                </td>
                                <td className="px-3 py-4 text-right font-mono pr-6">
                                    <span className={`font-black text-[11px] ${(stock.cashRunwayQuarters ?? 0) < 4 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {stock.cashRunwayQuarters !== null ? (stock.cashRunwayQuarters >= 50 ? '∞' : `${stock.cashRunwayQuarters.toFixed(0)}Q`) : '—'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
