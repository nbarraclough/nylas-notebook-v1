import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const notetakerId = req.nextUrl.searchParams.get('notetakerId')
  const grantId = req.nextUrl.searchParams.get('grantId')

  if (!notetakerId || !grantId) {
    return NextResponse.json({ error: 'Missing notetakerId or grantId' }, { status: 400 })
  }

  try {
    console.log(`Fetching recording for notetakerId: ${notetakerId}, grantId: ${grantId}`);

    const response = await fetch(`https://api-staging.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}/media`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, application/gzip',
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch recording: ${response.status} ${response.statusText}`);
      return NextResponse.json({ error: `Failed to fetch recording: ${response.status} ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    console.log('Nylas API response:', data);

    if (!data.recording_url) {
      console.error('No recording URL found in Nylas API response');
      return NextResponse.json({ error: 'No recording URL found' }, { status: 404 })
    }

    console.log(`Fetching video from URL: ${data.recording_url}`);
    const videoResponse = await fetch(data.recording_url)
    
    if (!videoResponse.ok) {
      console.error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
      return NextResponse.json({ error: `Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}` }, { status: videoResponse.status })
    }

    const contentType = videoResponse.headers.get('Content-Type')
    const contentLength = videoResponse.headers.get('Content-Length')

    console.log('Video response headers:', {
      'Content-Type': contentType,
      'Content-Length': contentLength
    });

    // Set up the response headers
    const headers = new Headers()
    headers.set('Content-Type', contentType || 'video/webm')
    headers.set('Content-Disposition', `attachment; filename="recording_${notetakerId}.webm"`)
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    // Create a ReadableStream from the video response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = videoResponse.body.getReader()
        let totalBytesRead = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          totalBytesRead += value.length
          controller.enqueue(value)
          console.log(`Streamed ${totalBytesRead} bytes`);
        }
        console.log(`Finished streaming, total bytes: ${totalBytesRead}`);
        controller.close()
      },
    })

    return new NextResponse(stream, {
      status: 200,
      statusText: 'OK',
      headers,
    })
  } catch (error) {
    console.error('Error streaming recording:', error)
    return NextResponse.json({ error: 'Failed to stream recording', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

