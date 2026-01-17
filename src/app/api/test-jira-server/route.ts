import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url, auth } = await request.json();

    if (!url || !auth) {
      return NextResponse.json(
        { success: false, error: 'URL and auth are required' },
        { status: 400 }
      );
    }

    console.log('Testing Jira Server connection to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // CORS headers for internal requests
        'User-Agent': 'Flow4Jira/1.0'
      }
    });

    console.log('Jira Server response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `Jira Server returned ${response.status}: ${response.statusText}`,
        details: errorText
      });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data,
      metadata: {
        status: response.status,
        url: url,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Jira Server test error:', error);

    return NextResponse.json({
      success: false,
      error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}