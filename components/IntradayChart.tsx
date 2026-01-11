'use client';

import { useEffect, useState } from 'react';

interface ChartPoint {
    date: string;
    close: number;
}

export default function IntradayChart({ ticker }: { ticker: string }) {
    const [data, setData] = useState<ChartPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchChart() {
            try {
                const res = await fetch(`/api/chart/${ticker}`);
                const json = await res.json();
                if (Array.isArray(json)) {
                    setData(json);
                }
            } catch (err) {
                console.error('Failed to load chart', err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchChart();
    }, [ticker]);

    if (isLoading) {
        return <div className="h-32 w-full bg-slate-50 animate-pulse rounded-xl border border-slate-100" />;
    }

    if (data.length < 2) {
        return null;
    }

    const prices = data.map(d => d.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const padding = range * 0.1;

    // Normalize points for a 200x80 SVG viewbox
    const width = 300;
    const height = 80;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.close - (min - padding)) / (range + padding * 2)) * height;
        return `${x},${y}`;
    }).join(' ');

    const polyPoints = `0,${height} ${points} ${width},${height}`;

    const isUp = prices[prices.length - 1] >= prices[0];
    const strokeColor = isUp ? '#10b981' : '#f43f5e';
    const fillColor = isUp ? 'url(#gradient-up)' : 'url(#gradient-down)';

    return (
        <div className="relative w-full h-32 mt-4 bg-white rounded-xl border border-slate-100 p-2 overflow-hidden shadow-sm">
            <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Intraday 1m</span>
                <span className={`text-[10px] font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ${data[data.length - 1].close.toFixed(2)}
                </span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20 overflow-visible">
                <defs>
                    <linearGradient id="gradient-up" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="gradient-down" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                    </linearGradient>
                </defs>
                <polyline
                    fill={fillColor}
                    points={polyPoints}
                />
                <polyline
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                />
            </svg>
        </div>
    );
}
