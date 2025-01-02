import { NextResponse } from 'next/server'

export async function POST() {
  console.log('Initiating Nylas authentication')
  const clientId = process.env.NYLAS_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/auth-success.html`

  if (!clientId) {
    console.error('NYLAS_CLIENT_ID is not set')
    return NextResponse.json({ error: 'Missing NYLAS_CLIENT_ID' }, { status: 500 })
  }

  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    console.error('NEXT_PUBLIC_BASE_URL is not set')
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_BASE_URL' }, { status: 500 })
  }

  const authUrl = `https://api-staging.us.nylas.com/v3/connect/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`

  console.log('Generated auth URL:', authUrl)

  try {
    // Attempt to fetch the auth URL to check if the Nylas API is responsive
    const response = await fetch(authUrl)
    if (!response.ok) {
      console.error('Error checking Nylas API:', response.status, response.statusText)
      if (response.status === 502) {
        return NextResponse.json({ error: 'Nylas API is currently unavailable. Please try again later.' }, { status: 502 })
      }
      return NextResponse.json({ error: `Nylas API error: ${response.statusText}` }, { status: response.status })
    }
  } catch (error) {
    console.error('Error checking Nylas API:', error)
    return NextResponse.json({ error: 'Failed to connect to Nylas API. Please check your network connection and try again.' }, { status: 500 })
  }

  return NextResponse.json({ authUrl })
}

