import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const headersList = headers()
  const webhookSecret = headersList.get('x-webhook-secret')

  // Check if the webhook secret is correct
  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    
    // Log the webhook data
    console.log('Received webhook:', body)

    // Here you can add any logic to process the webhook data
    // For example, you might want to update a database or trigger some action

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

