'use client';

import { StockData, getGripGrade } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface StockOverviewModalProps {
    stock: StockData;
    onClose: () => void;
}

function MetricRow({ label, value, color = 'text-white', highlight = false }: { label: string; value: string; color?: string; highlight?: boolean }) {
    return (
        <div className={`flex justify-between items-center p-3 rounded-xl ${highlight ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-800/30'}`}>
            <span className="text-xs text-slate-400">{label}</span>
            <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
        </div>
    );
}


export default function StockOverviewModal({ stock, onClose }: StockOverviewModalProps) {
    if (!stock) return null;

    const isProfitable = stock.ttmEps > 0;
    const isTurnaround = stock.ttmEps <= 0;

    // Calculate basic P/E (refresh from current price if possible)
    const ttmPe = isProfitable && stock.price > 0 && stock.ttmEps > 0 ? stock.price / stock.ttmEps : (stock.ttmPe || null);
    const forwardPe = stock.ntmEps && stock.ntmEps > 0 && stock.price > 0 ? stock.price / stock.ntmEps : (stock.forwardPe || null);
    const peg = ttmPe && stock.epsGrowthRate && stock.epsGrowthRate > 0 ? ttmPe / stock.epsGrowthRate : (stock.peg || null);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-slate-900 border-t sm:border border-slate-800 sm:rounded-2xl shadow-2xl">

                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md px-4 py-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-white">{stock.ticker}</h2>
                        <span className="px-2 py-0.5 rounded-[4px] bg-blue-500/10 text-blue-400 text-[8px] font-black tracking-tighter border border-blue-500/20">
                            {stock.exchange || 'NASDAQ'}
                        </span>
                        {isTurnaround && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-bold border border-amber-500/20">
                                TURNAROUND
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-full hover:bg-slate-800 transition-colors text-slate-500"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-5">
                    {/* Name & Sector */}
                    <div>
                        <p className="text-sm text-slate-300 font-bold">{stock.name}</p>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1 font-semibold">{stock.sector} · {stock.industry || 'Unknown'}</p>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                {isProfitable ? 'GRIP Score' : 'T-GRIP Score'}
                            </p>
                            <p className={`text-2xl font-black ${isProfitable
                                ? ((stock.gripScore ?? 0) >= 6 ? 'text-emerald-400' : 'text-white')
                                : ((stock.tGripScore ?? 0) >= 6 ? 'text-amber-400' : 'text-white')
                                }`}>
                                {isProfitable ? stock.gripScore?.toFixed(1) : stock.tGripScore?.toFixed(1) ?? '—'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold">
                                {isProfitable ? getGripGrade(stock.gripScore) : 'Potential Turnaround'}
                            </p>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mb-1">Price</p>
                            <p className="text-2xl font-black text-white">${formatNumber(stock.price)}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{formatMarketCap(stock.marketCap)}</p>
                        </div>
                    </div>

                    {/* Earnings & Growth Section */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Growth & Earnings</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <MetricRow
                                label="TTM EPS"
                                value={`$${stock.ttmEps?.toFixed(2)}`}
                                color={stock.ttmEps > 0 ? 'text-emerald-400' : 'text-rose-400'}
                            />
                            <MetricRow
                                label="NTM EPS (Est.)"
                                value={stock.ntmEps ? `$${stock.ntmEps.toFixed(2)}` : '—'}
                                color={(stock.ntmEps ?? 0) > 0 ? 'text-cyan-400' : 'text-rose-400'}
                            />
                            <MetricRow
                                label="3Y Revenue CAGR"
                                value={stock.cagr3Y !== null ? `${stock.cagr3Y.toFixed(1)}%` : '—'}
                                color={(stock.cagr3Y ?? 0) > 20 ? 'text-rose-400' : 'text-white'}
                                highlight={(stock.cagr3Y ?? 0) > 30}
                            />
                            <MetricRow
                                label="EPS Growth (Est.)"
                                value={stock.epsGrowthRate !== null ? `${stock.epsGrowthRate.toFixed(1)}%` : '—'}
                                color={(stock.epsGrowthRate ?? 0) > 20 ? 'text-emerald-400' : 'text-white'}
                            />
                        </div>
                        {isProfitable && (
                            <MetricRow
                                label="Gap Ratio (TTM P/E / FWD P/E)"
                                value={stock.gapRatio ? `${stock.gapRatio.toFixed(2)}x` : '—'}
                                color="text-indigo-400"
                                highlight
                            />
                        )}
                    </div>

                    {/* Valuation Section - Different for profitable vs turnaround */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Valuation</h3>

                        {isProfitable ? (
                            <div className="grid grid-cols-3 gap-2">
                                <MetricRow
                                    label="TTM P/E"
                                    value={ttmPe ? `${ttmPe.toFixed(1)}x` : '—'}
                                />
                                <MetricRow
                                    label="FWD P/E"
                                    value={forwardPe ? `${forwardPe.toFixed(1)}x` : '—'}
                                    color="text-cyan-400"
                                />
                                <MetricRow
                                    label="PEG"
                                    value={peg ? peg.toFixed(2) : '—'}
                                    color={peg && peg < 1.2 ? 'text-emerald-400' : 'text-white'}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <MetricRow
                                    label="EV/Revenue"
                                    value={stock.evRevenue ? `${stock.evRevenue.toFixed(1)}x` : '—'}
                                    color="text-cyan-400"
                                    highlight
                                />
                                <MetricRow
                                    label="PSR (P/S)"
                                    value={stock.psr ? `${stock.psr.toFixed(1)}x` : '—'}
                                    color="text-slate-300"
                                />
                                <MetricRow
                                    label="Rule of 40"
                                    value={stock.ruleOf40 !== null && stock.ruleOf40 !== undefined ? stock.ruleOf40.toFixed(0) : '—'}
                                    color={stock.ruleOf40 && stock.ruleOf40 >= 40 ? 'text-emerald-400' : stock.ruleOf40 && stock.ruleOf40 >= 20 ? 'text-yellow-400' : 'text-rose-400'}
                                    highlight
                                />
                                <MetricRow
                                    label="YoY Growth"
                                    value={stock.revenueGrowthYoY !== null && stock.revenueGrowthYoY !== undefined ? formatPercent(stock.revenueGrowthYoY) : '—'}
                                    color={(stock.revenueGrowthYoY ?? 0) > 0.2 ? 'text-emerald-400' : 'text-white'}
                                />
                            </div>
                        )}
                    </div>

                    {/* Margins */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Profitability</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-800/30 rounded-xl p-2 text-center">
                                <p className="text-[8px] font-bold text-slate-600 uppercase mb-1">Gross</p>
                                <p className={`text-xs font-black ${(stock.grossMargin ?? 0) >= 0.5 ? 'text-emerald-400' : 'text-white'}`}>
                                    {stock.grossMargin !== null && stock.grossMargin !== undefined ? formatPercent(stock.grossMargin, 0) : '—'}
                                </p>
                            </div>
                            <div className="bg-slate-800/30 rounded-xl p-2 text-center">
                                <p className="text-[8px] font-bold text-slate-600 uppercase mb-1">Operating</p>
                                <p className={`text-xs font-black ${(stock.operatingMargin ?? 0) > 0 ? 'text-white' : 'text-rose-400'}`}>
                                    {stock.operatingMargin !== null && stock.operatingMargin !== undefined ? formatPercent(stock.operatingMargin, 0) : '—'}
                                </p>
                            </div>
                            <div className="bg-slate-800/30 rounded-xl p-2 text-center">
                                <p className="text-[8px] font-bold text-slate-600 uppercase mb-1">Net</p>
                                <p className={`text-xs font-black ${(stock.netMargin ?? 0) > 0 ? 'text-white' : 'text-rose-400'}`}>
                                    {stock.netMargin !== null && stock.netMargin !== undefined ? formatPercent(stock.netMargin, 0) : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cash & Liquidity - Critical for turnaround stocks */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Cash & Liquidity</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <MetricRow
                                label="Total Cash"
                                value={formatMarketCap(stock.cashAndShortTermInvestments ?? 0)}
                            />
                            <MetricRow
                                label="Cash Flow (TTM)"
                                value={formatMarketCap(stock.freeCashFlow ?? 0)}
                                color={(stock.freeCashFlow ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'}
                            />
                        </div>
                        {stock.cashRunwayQuarters !== null && stock.cashRunwayQuarters !== undefined && (
                            <div className={`rounded-xl p-3 flex justify-between items-center ${isTurnaround ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/30'
                                }`}>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Cash Runway</span>
                                <span className={`text-sm font-black ${stock.cashRunwayQuarters < 4 ? 'text-rose-400' :
                                    stock.cashRunwayQuarters < 8 ? 'text-yellow-400' : 'text-emerald-400'
                                    }`}>
                                    {stock.cashRunwayQuarters >= 50 ? '∞ (Positive CF)' : `${stock.cashRunwayQuarters.toFixed(1)} Quarters`}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Warnings */}
                    {stock.epsWarnings && stock.epsWarnings.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Notes</h3>
                            <div className="flex flex-wrap gap-2">
                                {stock.epsWarnings?.map((w: string, i: number) => (
                                    <span key={i} className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full border border-amber-500/20">
                                        {w}
                                    </span>
                                ))}
                                {stock.beta && stock.beta > 1.5 && (
                                    <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-1 rounded-full border border-rose-500/20">
                                        High Beta β{stock.beta.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800/50 text-center">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest">Updated: {new Date(stock.lastUpdated).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
}
