'use client';

import { RankingMetadata } from '@/types';
import { formatRelativeTime } from '@/lib/utils/format';

interface MetadataCardProps {
    metadata: RankingMetadata | null;
    isLoading?: boolean;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export default function MetadataCard({ metadata, isLoading, onRefresh, isRefreshing }: MetadataCardProps) {
    if (isLoading) {
        return (
            <div className="animate-pulse rounded-2xl bg-slate-900/40 p-4 border border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-slate-800 rounded" />
                    <div className="h-8 w-20 bg-slate-800 rounded-lg" />
                </div>
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-3 text-amber-500">
                    <span className="text-lg">!</span>
                    <div>
                        <p className="font-bold text-sm">데이터 없음</p>
                        <p className="text-[10px] text-amber-500/70">스캔 완료 후 새로고침하세요.</p>
                    </div>
                </div>
            </div>
        );
    }

    const qualityCount = (metadata.totalProcessed || 0) - (metadata.totalExcluded || 0);

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Stats Row */}
                <div className="flex items-center gap-4 overflow-x-auto text-xs">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-500">Updated</span>
                        <span className="font-bold text-white">{formatRelativeTime(metadata.timestamp)}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700 hidden sm:block" />
                    <div className="flex-shrink-0">
                        <span className="text-slate-500">Universe </span>
                        <span className="font-bold text-white">{(metadata.totalProcessed || 0).toLocaleString()}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700 hidden sm:block" />
                    <div className="flex-shrink-0">
                        <span className="text-slate-500">Quality </span>
                        <span className="font-bold text-emerald-400">{qualityCount.toLocaleString()}</span>
                    </div>
                </div>

                {/* Refresh Button */}
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className={`
                            flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                            ${isRefreshing
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-white text-slate-950 hover:bg-emerald-400 active:scale-95'}
                        `}
                    >
                        <span className="flex items-center gap-2">
                            <svg
                                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isRefreshing ? 'Syncing' : 'Refresh'}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}
