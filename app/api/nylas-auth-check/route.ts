import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const grantId = request.cookies.get('nylasGrantId')?.value

  if (!grantId) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    const response = await fetch(`https://api-staging.us.nylas.com/v3/grants/${grantId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({ authenticated: true, grantId })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}

