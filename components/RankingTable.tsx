'use client';

import { StockData } from '@/types';
import { formatNumber, formatMarketCap } from '@/lib/utils/format';

interface RankingTableProps {
    data: StockData[];
    isLoading?: boolean;
}

// GRIP Status 배지 컴포넌트
function GripBadge({ status }: { status: StockData['gripStatus'] }) {
    if (!status) return <span className="text-slate-500">—</span>;

    const styles = {
        high: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        potential: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        watch: 'bg-slate-600/50 text-slate-300 border-slate-500/30'
    };

    const labels = {
        high: 'HIGH',
        potential: 'POTENTIAL',
        watch: 'WATCH'
    };

    return (
        <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${styles[status]}`}>
            {labels[status]}
        </span>
    );
}

export default function RankingTable({ data, isLoading }: RankingTableProps) {
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
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">데이터가 없습니다</p>
                <p className="text-sm mt-1">API 키를 설정하고 데이터를 갱신해주세요</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700/50">
                        <th className="px-3 py-4 text-left font-semibold text-slate-300">#</th>
                        <th className="px-3 py-4 text-left font-semibold text-slate-300">Ticker</th>
                        <th className="px-3 py-4 text-left font-semibold text-slate-300 hidden xl:table-cell">Name</th>
                        <th className="px-3 py-4 text-center font-semibold text-cyan-400">
                            <span className="inline-flex items-center gap-1" title="Growth Re-rating Inflection Point">
                                GRIP
                            </span>
                        </th>
                        <th className="px-3 py-4 text-right font-semibold text-slate-300 hidden md:table-cell">PEG</th>
                        <th className="px-3 py-4 text-right font-semibold text-blue-400 hidden lg:table-cell">Fwd PEG</th>
                        <th className="px-3 py-4 text-right font-semibold text-emerald-400">
                            <span className="inline-flex items-center gap-1">
                                Gap Ratio
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </span>
                        </th>
                        <th className="px-3 py-4 text-right font-semibold text-slate-300">Price</th>
                        <th className="px-3 py-4 text-right font-semibold text-slate-300 hidden md:table-cell">TTM P/E</th>
                        <th className="px-3 py-4 text-right font-semibold text-slate-300 hidden lg:table-cell">Fwd P/E</th>
                        <th className="px-3 py-4 text-right font-semibold text-purple-400 hidden xl:table-cell">GRIP Score</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((stock, index) => (
                        <tr
                            key={stock.ticker}
                            className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                        >
                            <td className="px-3 py-3 text-slate-500 font-mono text-xs">{index + 1}</td>
                            <td className="px-3 py-3">
                                <div>
                                    <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                        {stock.ticker}
                                    </span>
                                    <span className="block text-xs text-slate-500 xl:hidden truncate max-w-[100px]">
                                        {stock.name}
                                    </span>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-slate-400 hidden xl:table-cell max-w-[180px] truncate text-xs" title={stock.name}>
                                {stock.name}
                            </td>
                            <td className="px-3 py-3 text-center">
                                <GripBadge status={stock.gripStatus} />
                            </td>
                            <td className="px-3 py-3 text-right font-mono hidden md:table-cell">
                                <span className={`${stock.peg && stock.peg < 1.5
                                        ? 'text-emerald-400 font-semibold'
                                        : 'text-slate-400'
                                    }`}>
                                    {stock.peg ? formatNumber(stock.peg, 2) : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono hidden lg:table-cell">
                                <span className={`${stock.forwardPeg && stock.forwardPeg < 1.5
                                        ? 'text-blue-400 font-semibold'
                                        : 'text-slate-400'
                                    }`}>
                                    {stock.forwardPeg ? formatNumber(stock.forwardPeg, 2) : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                                <span className={`font-bold font-mono px-2 py-1 rounded-lg text-xs ${stock.gapRatio && stock.gapRatio > 1.5
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : stock.gapRatio && stock.gapRatio > 1.3
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-slate-700/50 text-slate-300'
                                    }`}>
                                    {stock.gapRatio ? formatNumber(stock.gapRatio, 2) : '—'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-white text-xs">
                                ${formatNumber(stock.price)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-300 text-xs hidden md:table-cell">
                                {stock.ttmPe ? formatNumber(stock.ttmPe, 1) : '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-300 text-xs hidden lg:table-cell">
                                {stock.forwardPe ? formatNumber(stock.forwardPe, 1) : '—'}
                            </td>
                            <td className="px-3 py-3 text-right hidden xl:table-cell">
                                <span className={`font-bold font-mono px-2 py-1 rounded text-xs ${stock.gripScore && stock.gripScore > 2.0
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : stock.gripScore && stock.gripScore > 1.5
                                            ? 'bg-cyan-500/20 text-cyan-400'
                                            : 'text-slate-400'
                                    }`}>
                                    {stock.gripScore ? formatNumber(stock.gripScore, 2) : '—'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
