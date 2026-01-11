'use client';

import { formatNumber, formatPercent } from '@/lib/utils/format';
import { StockData } from '@/types';

interface TrendChartPopoverProps {
    stock: StockData;
    metric: string;
    label: string;
    onClose: () => void;
}

export default function TrendChartPopover({ stock, metric, label, onClose }: TrendChartPopoverProps) {
    // Determine which history to use based on metric
    let history: { period: string; value: number }[] = [];
    let metricLabel = label;

    if (metric === 'eps') {
        history = stock.epsHistory || [];
        metricLabel = 'EPS';
    } else if (metric === 'revenue') {
        history = stock.revenueHistory || [];
        metricLabel = 'Revenue';
    } else if (metric === 'fcf') {
        history = stock.fcfHistory || [];
        metricLabel = 'Free Cash Flow';
    } else if (metric === 'price' || metric === 'netMargin') {
        // Price와 netMargin은 별도 히스토리가 없음, 가장 관련 있는 데이터 표시
        history = metric === 'price' ? (stock.revenueHistory || []) : (stock.fcfHistory || []);
        metricLabel = metric === 'price' ? 'Revenue (가격 히스토리 없음)' : 'FCF (Margin 데이터 없음)';
    }


    // Chart data calculation
    const maxValue = history.length > 0 ? Math.max(...history.map(d => d.value), 0) * 1.1 : 100;
    const minValue = history.length > 0 ? Math.min(...history.map(d => d.value), maxValue) * 0.9 : 0;
    const range = maxValue - minValue;

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-4 w-72 animate-in fade-in zoom-in duration-200 pointer-events-auto">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        {stock.ticker} Trend
                    </h4>
                    <span className="text-xs font-black text-slate-900">{metricLabel}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {history.length > 0 ? (
                <>
                    {/* Mini Bar Chart */}
                    <div className="h-24 w-full mb-4 flex items-end justify-between gap-2">
                        {history.map((d, i) => {
                            const height = range > 0 ? ((d.value - minValue) / range) * 100 : 50;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                    <div
                                        className="w-full bg-slate-100 rounded-t-[2px] transition-all group-hover:bg-emerald-500/20"
                                        style={{ height: `${Math.max(height, 5)}%` }}
                                    />
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                                        {metric === 'eps' ? d.value.toFixed(2) : formatNumber(d.value)}
                                    </div>
                                    <div className="mt-1 text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                                        {d.period.split(' ')[1]}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Data Summary */}
                    <div className="space-y-2 border-t border-slate-50 pt-3">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-bold">Latest ({history[history.length - 1].period})</span>
                            <span className="text-slate-900 font-black">
                                {metric === 'eps' ? history[history.length - 1].value.toFixed(2) : formatNumber(history[history.length - 1].value)}
                            </span>
                        </div>
                        {history.length >= 2 && (
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400 font-bold">QoQ Growth</span>
                                <span className={`font-black ${history[history.length - 1].value > history[history.length - 2].value ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatPercent((history[history.length - 1].value / (history[history.length - 2].value || 1)) - 1)}
                                </span>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="h-32 flex flex-col items-center justify-center text-[10px] text-slate-400 font-bold text-center spacing-y-1">
                    <p>No historical data available</p>
                    <p className="opacity-50 font-medium">TTM 구성 데이터 누락</p>
                </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                    TTM Component Data (4 Quarters)
                </span>
            </div>
        </div>
    );
}
