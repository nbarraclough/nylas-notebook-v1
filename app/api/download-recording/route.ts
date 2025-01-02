import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { notetakerId, grantId } = await req.json()

    const response = await fetch(`https://api-staging.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}/media`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, application/gzip',
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Recording not available' }, { status: 404 })
      }
      throw new Error(`Failed to download recording: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Instead of returning the URL, we'll return a token that the client can use to request the file
    const downloadToken = Buffer.from(`${grantId}:${notetakerId}`).toString('base64')
    return NextResponse.json({ downloadToken })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

