'use client';

import { StockData, getGripGrade } from '@/types';
import { formatNumber, formatMarketCap, formatPercent } from '@/lib/utils/format';

interface StockOverviewModalProps {
    stock: StockData | null;
    onClose: () => void;
}

function MetricCard({ label, value, subValue, color = 'text-white' }: { label: string; value: string; subValue?: string; color?: string }) {
    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 backdrop-blur-md">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
            {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
    );
}

export default function StockOverviewModal({ stock, onClose }: StockOverviewModalProps) {
    if (!stock) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">

                {/* Header Section */}
                <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md px-6 py-6 border-b border-slate-800 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-black text-white tracking-tighter">{stock.ticker}</h2>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase tracking-widest">
                                {stock.exchange || 'NASDAQ'}
                            </span>
                        </div>
                        <p className="text-slate-400 font-medium mt-1">{stock.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-500 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-8">

                    {/* Top Stats Layer */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard label="Current Price" value={`$${formatNumber(stock.price)}`} subValue="Real-time Quote" />
                        <MetricCard label="Market Cap" value={formatMarketCap(stock.marketCap)} subValue="Equity Value" />
                        <MetricCard label="Sector" value={stock.sector || 'N/A'} subValue={stock.industry || 'N/A'} />
                        <MetricCard
                            label="GRIP Grade"
                            value={getGripGrade(stock.gripScore)}
                            subValue={`Score: ${stock.gripScore?.toFixed(1)} / 20`}
                            color={stock.gripScore && stock.gripScore >= 16 ? 'text-emerald-400' : 'text-slate-300'}
                        />
                    </div>

                    {/* Financial Breakdown Grid */}
                    <div className="grid md:grid-cols-3 gap-8">

                        {/* Column 1: Growth Metrics */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Growth & Estimates</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl">
                                    <span className="text-sm text-slate-400">TTM EPS</span>
                                    <span className="text-sm font-mono text-white font-bold">${stock.ttmEps?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl border border-emerald-500/20">
                                    <span className="text-sm text-emerald-400/80">NTM EPS (Exp.)</span>
                                    <span className="text-sm font-mono text-emerald-400 font-bold">${stock.ntmEps?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl">
                                    <span className="text-sm text-slate-400">GAP Ratio</span>
                                    <span className="text-sm font-mono text-indigo-400 font-bold">{stock.gapRatio?.toFixed(2)}x</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl">
                                    <span className="text-sm text-slate-400">Exp. Growth Rate</span>
                                    <span className="text-sm font-mono text-white font-bold">{stock.epsGrowthRate?.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Profitability */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Profitability & Margins</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl text-xs">
                                    <span className="text-slate-400">Gross Margin</span>
                                    <span className="text-white font-bold">{stock.grossMargin ? formatPercent(stock.grossMargin) : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl text-xs">
                                    <span className="text-slate-400">Operating Margin</span>
                                    <span className="text-white font-bold">{stock.operatingMargin ? formatPercent(stock.operatingMargin) : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl text-xs">
                                    <span className="text-slate-400">Net Margin</span>
                                    <span className="text-white font-bold">{stock.netMargin ? formatPercent(stock.netMargin) : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl text-xs">
                                    <span className="text-slate-400">TTM Revenue</span>
                                    <span className="text-white font-bold">{stock.revenue ? formatMarketCap(stock.revenue) : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Valuation & Stability */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Valuation & Liquidity</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl text-xs">
                                    <span className="text-slate-400">TTM PE</span>
                                    <span className="text-white font-bold">{stock.ttmPe?.toFixed(1)}x</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl text-xs border border-cyan-500/20">
                                    <span className="text-cyan-400/80">Forward PE</span>
                                    <span className="text-cyan-400 font-bold">{stock.forwardPe?.toFixed(1)}x</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl text-xs">
                                    <span className="text-slate-400">PEG Ratio</span>
                                    <span className="text-emerald-400 font-bold">{stock.peg?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl text-xs">
                                    <span className="text-slate-400">Cash Runway</span>
                                    <span className={`font-bold ${stock.cashRunwayQuarters && stock.cashRunwayQuarters < 4 ? 'text-rose-400' : 'text-slate-300'}`}>
                                        {stock.cashRunwayQuarters ? `${stock.cashRunwayQuarters.toFixed(1)} Quarters` : '∞ (Positive)'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warnings & Meta Area */}
                    {(stock.epsWarnings.length > 0 || stock.beta) && (
                        <div className="pt-6 border-t border-slate-800">
                            <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800">
                                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Analyst Sentiment & Risks</h4>
                                <div className="flex flex-wrap gap-3">
                                    {stock.epsWarnings.map((w, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                                            <span className="text-amber-500 text-lg">✦</span>
                                            <span className="text-sm text-slate-300 font-medium">{w}</span>
                                        </div>
                                    ))}
                                    {stock.beta && stock.beta > 1.5 && (
                                        <div className="flex items-center gap-2 bg-rose-500/5 border border-rose-500/20 px-4 py-2 rounded-xl">
                                            <span className="text-rose-500 text-lg">⚠</span>
                                            <span className="text-sm text-rose-400 font-bold">High Beta ({stock.beta.toFixed(2)})</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Section */}
                <div className="px-6 py-4 bg-slate-950/20 border-t border-slate-800/50 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Last Data Sync: {new Date(stock.lastUpdated).toLocaleString()}</span>
                    <button className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest">Open in TradingView</button>
                </div>

            </div>
        </div>
    );
}
