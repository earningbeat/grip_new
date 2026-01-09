import { NextResponse } from 'next/server';
import config from '@/config.json';
import { DEMO_DATA, DEMO_METADATA } from '@/lib/data/demo';
import { sortByGapRatio } from '@/lib/utils/filters';
import type { StockData } from '@/lib/utils/filters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * 랭킹 데이터 조회 API
 * 
 * 데모 모드 또는 실제 데이터 반환
 */
export async function GET() {
    try {
        // 데모 모드 체크
        const demoConfig = config.demo_mode as { enabled: boolean; fallback_on_api_error: boolean } | undefined;

        if (demoConfig?.enabled) {
            console.log('[API/ranking] Demo mode enabled, returning demo data');

            // Gap Ratio 기준 정렬
            const sortedData = sortByGapRatio(DEMO_DATA, 'desc');

            return NextResponse.json({
                success: true,
                data: sortedData,
                metadata: {
                    ...DEMO_METADATA,
                    timestamp: new Date().toISOString(),
                    isDemo: true
                }
            });
        }

        // TODO: 실제 API 파이프라인 호출
        // const result = await runPipeline();

        // Fallback to demo data if no real data
        return NextResponse.json({
            success: true,
            data: sortByGapRatio(DEMO_DATA, 'desc'),
            metadata: {
                ...DEMO_METADATA,
                timestamp: new Date().toISOString(),
                isDemo: true
            }
        });

    } catch (error) {
        console.error('[API/ranking] Error:', error);

        // Fallback on error if configured
        const demoConfig = config.demo_mode as { enabled: boolean; fallback_on_api_error: boolean } | undefined;

        if (demoConfig?.fallback_on_api_error) {
            console.log('[API/ranking] Falling back to demo data due to error');
            return NextResponse.json({
                success: true,
                data: sortByGapRatio(DEMO_DATA, 'desc'),
                metadata: {
                    ...DEMO_METADATA,
                    timestamp: new Date().toISOString(),
                    isDemo: true,
                    fallbackReason: error instanceof Error ? error.message : 'Unknown error'
                }
            });
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                data: []
            },
            { status: 500 }
        );
    }
}
