import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline/processor';

// Vercel Cron configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for processing

/**
 * Cron Job Endpoint: 데이터 갱신
 * 
 * Vercel Cron에서 호출하거나 수동 트리거 가능
 * Authorization 헤더로 CRON_SECRET 검증
 */
export async function GET(request: NextRequest) {
    // Cron secret 검증
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        console.log('[Cron] Starting data update...');

        const result = await runPipeline();

        // TODO: Vercel KV 또는 다른 저장소에 캐싱
        // 현재는 JSON 파일로 저장 (data 폴더)

        console.log('[Cron] Data update completed');

        return NextResponse.json({
            success: true,
            message: 'Data updated successfully',
            metadata: result.metadata
        });

    } catch (error) {
        console.error('[Cron] Error:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
