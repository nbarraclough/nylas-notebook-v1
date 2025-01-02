import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { notetakerId, grantId } = await req.json()
    console.log('Received request to leave meeting:', { notetakerId, grantId })

    if (!notetakerId || !grantId) {
      console.error('Missing notetakerId or grantId')
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const apiKey = process.env.NYLAS_API_KEY
    if (!apiKey) {
      console.error('NYLAS_API_KEY is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const url = `https://api-staging.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}`
    console.log('Sending DELETE request to:', url)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json, application/gzip',
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    const responseText = await response.text()
    console.log('Raw response from Nylas API:', responseText)

    if (!response.ok) {
      console.error(`Failed to make notetaker leave. Status: ${response.status}, Response: ${responseText}`)
      return NextResponse.json({ 
        error: 'Failed to make notetaker leave', 
        details: `API responded with status ${response.status}: ${responseText}`
      }, { status: response.status })
    }

    console.log('Successfully made notetaker leave')
    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Error in leave-meeting route:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

