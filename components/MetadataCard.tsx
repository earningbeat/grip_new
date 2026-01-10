'use client';

import { RankingMetadata } from '@/types';
import { formatDate, formatRelativeTime } from '@/lib/utils/format';

interface MetadataCardProps {
    metadata: RankingMetadata | null;
    isLoading?: boolean;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

function StatItem({ label, value, subValue, color = 'text-white' }: { label: string; value: string; subValue?: string; color?: string }) {
    return (
        <div className="flex flex-col">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
            {subValue && <p className="text-[10px] text-slate-600 font-medium mt-0.5 uppercase">{subValue}</p>}
        </div>
    );
}

export default function MetadataCard({ metadata, isLoading, onRefresh, isRefreshing }: MetadataCardProps) {
    if (isLoading) {
        return (
            <div className="animate-pulse rounded-3xl border border-slate-700/30 bg-slate-900/40 p-8">
                <div className="h-4 w-32 bg-slate-700/50 rounded mb-8" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <div className="h-3 w-16 bg-slate-800 rounded" />
                            <div className="h-8 w-24 bg-slate-800 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md p-6">
                <div className="flex items-center gap-4 text-amber-500">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center animate-pulse">
                        <span className="text-xl">!</span>
                    </div>
                    <div>
                        <p className="font-black text-sm uppercase tracking-wider">Empty Dataset</p>
                        <p className="text-xs text-amber-500/70 mt-0.5">Please refresh data to populate the cache.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-8 shadow-2xl">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">

                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatItem
                        label="Last Updated"
                        value={formatRelativeTime(metadata.timestamp)}
                        subValue={formatDate(metadata.timestamp).split(',')[0]}
                        color="text-emerald-400"
                    />
                    <StatItem
                        label="NASDAQ Universe"
                        value={(metadata.totalProcessed || 0).toLocaleString()}
                        subValue="Checked Tickers"
                    />
                    <StatItem
                        label="Target Pool"
                        value={((metadata.totalProcessed || 0) - (metadata.totalExcluded || 0)).toLocaleString()}
                        subValue=">$100M Market Cap"
                        color="text-cyan-400"
                    />
                    <StatItem
                        label="Pipeline Version"
                        value="2.0-STABLE"
                        subValue="FMP Growth Plan"
                        color="text-slate-500"
                    />
                </div>

                <div className="flex-shrink-0 flex items-center gap-4">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className={`
                                relative group px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all
                                ${isRefreshing
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-white text-slate-950 hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-lg shadow-white/5'}
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <svg
                                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {isRefreshing ? 'Syncing...' : 'Refresh'}
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Decorative bar */}
            <div className="mt-8 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 opacity-30" />
            </div>
        </div>
    );
}
