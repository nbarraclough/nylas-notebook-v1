import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { meetingLink, notetakerName, grantId, eventId } = await req.json()
    console.log('Received request:', { meetingLink, notetakerName, grantId, eventId })

    let finalMeetingLink = meetingLink

    if (eventId) {
      console.log(`Fetching event details for eventId: ${eventId}`)
      try {
        const eventResponse = await fetch(`https://api-staging.us.nylas.com/v3/grants/${grantId}/events/${eventId}?calendar_id=primary`, {
          headers: {
            'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
            'Content-Type': 'application/json',
          },
        })

        if (!eventResponse.ok) {
          const errorText = await eventResponse.text()
          console.error(`Failed to fetch event details. Status: ${eventResponse.status}, Response: ${errorText}`)
          return NextResponse.json({ 
            error: 'Failed to fetch event details', 
            details: `API responded with status ${eventResponse.status}: ${errorText}`
          }, { status: eventResponse.status })
        }

        const eventData = await eventResponse.json()
        console.log('Event data received:', JSON.stringify(eventData, null, 2))

        if (eventData.data && eventData.data.conferencing && eventData.data.conferencing.details && eventData.data.conferencing.details.url) {
          finalMeetingLink = eventData.data.conferencing.details.url
          console.log('Conferencing URL found:', finalMeetingLink)
        } else {
          console.warn('No conferencing URL found in event data')
          return NextResponse.json({ error: 'No conferencing URL found for this event', eventData }, { status: 400 })
        }
      } catch (error) {
        console.error('Error fetching event details:', error)
        return NextResponse.json({ 
          error: 'Failed to fetch event details', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 })
      }
    }

    if (!finalMeetingLink) {
      console.error('No valid meeting link found')
      return NextResponse.json({ error: 'No valid meeting link found' }, { status: 400 })
    }

    console.log('Sending request to Nylas API:', {
      url: `https://api-staging.us.nylas.com/v3/grants/${grantId}/notetakers`,
      body: {
        meeting_link: finalMeetingLink,
        notetaker_name: notetakerName,
      }
    });

    const response = await fetch(`https://api-staging.us.nylas.com/v3/grants/${grantId}/notetakers`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, application/gzip',
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meeting_link: finalMeetingLink,
        notetaker_name: notetakerName,
      }),
    });

    const responseText = await response.text()
    console.log('Raw response from Nylas API:', responseText)

    if (!response.ok) {
      console.error('Error response from Nylas API:', responseText)
      return NextResponse.json({ 
        error: 'Failed to send notetaker', 
        details: responseText,
        status: response.status,
        statusText: response.statusText
      }, { status: response.status })
    }

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Nylas API response as JSON:', parseError)
      return NextResponse.json({ 
        error: 'Invalid response from Nylas API', 
        details: responseText.slice(0, 200),
        fullResponse: responseText
      }, { status: 500 })
    }

    console.log('Successful response from Nylas API:', responseData)
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error in send-notetaker route:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace available'
    }, { status: 500 })
  }
}

