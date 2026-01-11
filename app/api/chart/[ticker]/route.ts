import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ ticker: string }> }
) {
    const { ticker } = await params;

    if (!FMP_API_KEY) {
        return NextResponse.json({ error: 'FMP API key not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(
            `https://financialmodelingprep.com/api/v3/historical-chart/1min/${ticker}?apikey=${FMP_API_KEY}`
        );

        if (!response.ok) {
            return NextResponse.json([]);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            return NextResponse.json([]);
        }

        const result = data.slice(0, 100).reverse();
        return NextResponse.json(result);
    } catch (error) {
        console.error('Chart API Error:', error);
        return NextResponse.json([]);
    }
}
