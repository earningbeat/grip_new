'use client';

import { StockData } from '@/types';
import { formatNumber, formatMarketCap } from '@/lib/utils/format';

interface HighBetaTableProps {
    data: StockData[];
    isLoading?: boolean;
}

export default function HighBetaTable({ data, isLoading }: HighBetaTableProps) {
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-lg font-medium">턴어라운드 후보가 없습니다</p>
                <p className="text-sm mt-1">데이터를 갱신해주세요</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700/50">
                        <th className="px-4 py-4 text-left font-semibold text-slate-300">#</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-300">Ticker</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-300 hidden lg:table-cell">Name</th>
                        <th className="px-4 py-4 text-left font-semibold text-slate-300 hidden md:table-cell">Sector</th>
                        <th className="px-4 py-4 text-right font-semibold text-slate-300">Price</th>
                        <th className="px-4 py-4 text-right font-semibold text-slate-300 hidden xl:table-cell">Market Cap</th>
                        <th className="px-4 py-4 text-right font-semibold text-red-400">TTM EPS</th>
                        <th className="px-4 py-4 text-right font-semibold text-slate-300">FY1 EPS</th>
                        <th className="px-4 py-4 text-right font-semibold text-emerald-400">
                            <span className="inline-flex items-center gap-1">
                                FY2 EPS
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </span>
                        </th>
                        <th className="px-4 py-4 text-right font-semibold text-amber-400 hidden lg:table-cell">EPS 개선폭</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((stock, index) => {
                        const epsImprovement = stock.fy2Eps - stock.ttmEps;

                        return (
                            <tr
                                key={stock.ticker}
                                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                            >
                                <td className="px-4 py-4 text-slate-500 font-mono">{index + 1}</td>
                                <td className="px-4 py-4">
                                    <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                                        {stock.ticker}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-slate-400 hidden lg:table-cell max-w-[200px] truncate" title={stock.name}>
                                    {stock.name}
                                </td>
                                <td className="px-4 py-4 hidden md:table-cell">
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300">
                                        {stock.sector}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right font-mono text-white">
                                    ${formatNumber(stock.price)}
                                </td>
                                <td className="px-4 py-4 text-right font-mono text-slate-400 hidden xl:table-cell">
                                    {formatMarketCap(stock.marketCap)}
                                </td>
                                <td className="px-4 py-4 text-right font-mono">
                                    <span className="text-red-400 bg-red-500/20 px-2 py-1 rounded">
                                        ${formatNumber(stock.ttmEps)}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right font-mono">
                                    <span className={stock.fy1Eps > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                                        ${formatNumber(stock.fy1Eps)}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <span className="font-bold font-mono px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                                        ${formatNumber(stock.fy2Eps)}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right font-mono hidden lg:table-cell">
                                    <span className="text-amber-400 font-semibold">
                                        +${formatNumber(epsImprovement)}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
