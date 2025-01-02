import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('Nylas auth callback initiated')
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    console.error('No authorization code received')
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 })
  }

  try {
    console.log('Exchanging code for token')
    console.log('Client ID:', process.env.NYLAS_CLIENT_ID)
    console.log('Redirect URI:', `${process.env.NEXT_PUBLIC_BASE_URL}/auth-success.html`)
    
    const tokenRequestBody = {
      client_id: process.env.NYLAS_CLIENT_ID,
      client_secret: process.env.NYLAS_API_KEY,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/auth-success.html`,
      code_verifier: 'nylas'
    }
    
    console.log('Token request body:', JSON.stringify(tokenRequestBody, null, 2))
    
    const tokenResponse = await fetch('https://api-staging.us.nylas.com/v3/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequestBody),
    })

    const responseText = await tokenResponse.text()
    console.log('Token exchange response:', responseText)

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenResponse.status, responseText)
      return NextResponse.json({ error: `Token exchange failed: ${responseText}` }, { status: 500 })
    }

    let tokenData
    try {
      tokenData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse token response:', parseError)
      return NextResponse.json({ error: 'Failed to parse token response' }, { status: 500 })
    }

    if (!tokenData.grant_id) {
      console.error('No grant_id in token response:', tokenData)
      return NextResponse.json({ error: 'Failed to obtain grant ID' }, { status: 500 })
    }

    console.log('Successfully obtained grant ID:', tokenData.grant_id)
    const response = NextResponse.json({ success: true, grantId: tokenData.grant_id })
    response.cookies.set('nylasGrantId', tokenData.grant_id, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    console.error('Error in Nylas auth callback:', error)
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

