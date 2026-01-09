'use client';

import { RankingMetadata } from '@/types';
import { formatDate, formatRelativeTime } from '@/lib/utils/format';

interface MetadataCardProps {
    metadata: RankingMetadata | null;
    isLoading?: boolean;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export default function MetadataCard({ metadata, isLoading, onRefresh, isRefreshing }: MetadataCardProps) {
    if (isLoading) {
        return (
            <div className="animate-pulse rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
                <div className="h-6 w-48 bg-slate-700 rounded mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i}>
                            <div className="h-4 w-20 bg-slate-700/50 rounded mb-2" />
                            <div className="h-8 w-16 bg-slate-700 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
                <div className="flex items-center gap-3 text-amber-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">아직 데이터가 없습니다. API 키를 설정하고 새로고침 해주세요.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="font-semibold text-white">Data Status</h3>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg
                            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isRefreshing ? 'Updating...' : 'Refresh Data'}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="text-lg font-semibold text-white">{formatRelativeTime(metadata.timestamp)}</p>
                    <p className="text-xs text-slate-500">{formatDate(metadata.timestamp)}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Processed</p>
                    <p className="text-lg font-semibold text-white">{metadata.totalProcessed.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Excluded</p>
                    <p className="text-lg font-semibold text-amber-400">{metadata.totalExcluded.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Processing Time</p>
                    <p className="text-lg font-semibold text-white">{(metadata.processingTimeMs / 1000).toFixed(1)}s</p>
                </div>
            </div>

            {Object.keys(metadata.excludedReasons).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Exclusion Reasons</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(metadata.excludedReasons).map(([reason, count]) => (
                            <span
                                key={reason}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-800 text-slate-400"
                            >
                                {reason}: <span className="font-semibold">{count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
