import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const grantId = searchParams.get('grantId')

  console.log('Received calendar events request:', { start, end, grantId })

  if (!start || !end || !grantId) {
    console.error('Missing required parameters')
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // We're using 'primary' as the calendar_id. If you need to support multiple calendars,
    // you might want to make this configurable or fetch it from somewhere.
    const calendarId = 'primary'
    
    const url = `https://api-staging.us.nylas.com/v3/grants/${grantId}/events?calendar_id=${calendarId}&start=${start}&end=${end}`
    console.log('Fetching calendar events from:', url)

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API request failed with status ${response.status}:`, errorText)
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('Successfully fetched calendar events:', data)
    return NextResponse.json({ events: data.data })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar events', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

