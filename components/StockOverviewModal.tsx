'use client';

import { StockData, getGripGrade } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface StockOverviewModalProps {
    stock: StockData | null;
    onClose: () => void;
}

function MetricRow({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex justify-between items-center bg-slate-800/30 p-3 rounded-xl">
            <span className="text-xs text-slate-400">{label}</span>
            <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
        </div>
    );
}

export default function StockOverviewModal({ stock, onClose }: StockOverviewModalProps) {
    if (!stock) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content - Full width on mobile, centered on desktop */}
            <div className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-slate-900 border-t sm:border border-slate-800 sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-200">

                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md px-4 py-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-white">{stock.ticker}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                            {stock.exchange || 'NASDAQ'}
                        </span>
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
                        <p className="text-sm text-slate-400 font-medium">{stock.name}</p>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">{stock.sector} · {stock.industry}</p>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                            <p className="text-[9px] text-slate-600 uppercase mb-1">GRIP Score</p>
                            <p className={`text-2xl font-black ${stock.gripScore && stock.gripScore >= 16 ? 'text-emerald-400' : 'text-white'}`}>
                                {stock.gripScore?.toFixed(1) ?? '—'}
                            </p>
                            <p className="text-[10px] text-slate-500">Grade: {getGripGrade(stock.gripScore)}</p>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                            <p className="text-[9px] text-slate-600 uppercase mb-1">Price</p>
                            <p className="text-2xl font-black text-white">${formatNumber(stock.price)}</p>
                            <p className="text-[10px] text-slate-500">{formatMarketCap(stock.marketCap)}</p>
                        </div>
                    </div>

                    {/* EPS Section */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Earnings</h3>
                        <MetricRow label="TTM EPS" value={`$${stock.ttmEps?.toFixed(2)}`} color={stock.ttmEps && stock.ttmEps > 0 ? 'text-emerald-400' : 'text-rose-400'} />
                        <MetricRow label="NTM EPS (Est.)" value={`$${stock.ntmEps?.toFixed(2) ?? '—'}`} color="text-cyan-400" />
                        <MetricRow label="Gap Ratio" value={`${stock.gapRatio?.toFixed(2) ?? '—'}x`} color="text-indigo-400" />
                        <MetricRow label="Growth Rate" value={`${stock.epsGrowthRate?.toFixed(1) ?? '—'}%`} />
                    </div>

                    {/* Valuation Section */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Valuation</h3>
                        <MetricRow label="TTM P/E" value={stock.ttmPe ? `${stock.ttmPe.toFixed(1)}x` : '—'} />
                        <MetricRow label="Forward P/E" value={stock.forwardPe ? `${stock.forwardPe.toFixed(1)}x` : '—'} color="text-cyan-400" />
                        <MetricRow label="PEG Ratio" value={stock.peg ? stock.peg.toFixed(2) : '—'} color={stock.peg && stock.peg < 1.5 ? 'text-emerald-400' : 'text-white'} />
                    </div>

                    {/* Profitability Section */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Margins</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-800/30 rounded-xl p-2 text-center">
                                <p className="text-[9px] text-slate-600">Gross</p>
                                <p className="text-sm font-bold text-white">{stock.grossMargin ? formatPercent(stock.grossMargin, 0) : '—'}</p>
                            </div>
                            <div className="bg-slate-800/30 rounded-xl p-2 text-center">
                                <p className="text-[9px] text-slate-600">Operating</p>
                                <p className="text-sm font-bold text-white">{stock.operatingMargin ? formatPercent(stock.operatingMargin, 0) : '—'}</p>
                            </div>
                            <div className="bg-slate-800/30 rounded-xl p-2 text-center">
                                <p className="text-[9px] text-slate-600">Net</p>
                                <p className="text-sm font-bold text-white">{stock.netMargin ? formatPercent(stock.netMargin, 0) : '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Runway */}
                    {stock.cashRunwayQuarters !== null && stock.cashRunwayQuarters !== undefined && (
                        <div className="bg-slate-800/30 rounded-xl p-3 flex justify-between items-center">
                            <span className="text-xs text-slate-400">Cash Runway</span>
                            <span className={`text-sm font-bold ${stock.cashRunwayQuarters < 4 ? 'text-rose-400' : 'text-slate-300'}`}>
                                {stock.cashRunwayQuarters >= 99 ? '∞ (Positive)' : `${stock.cashRunwayQuarters.toFixed(1)} Quarters`}
                            </span>
                        </div>
                    )}

                    {/* Warnings */}
                    {stock.epsWarnings && stock.epsWarnings.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Risks</h3>
                            <div className="flex flex-wrap gap-2">
                                {stock.epsWarnings.map((w, i) => (
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
