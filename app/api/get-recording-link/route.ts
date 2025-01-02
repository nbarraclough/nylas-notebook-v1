import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for download jobs (replace with a database in production)
const downloadJobs = new Map<string, { status: string, url?: string, error?: string }>()

export async function GET(req: NextRequest) {
  const notetakerId = req.nextUrl.searchParams.get('notetakerId')
  const grantId = req.nextUrl.searchParams.get('grantId')
  const jobId = req.nextUrl.searchParams.get('jobId')

  if (jobId) {
    // Check status of existing job
    const job = downloadJobs.get(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    return NextResponse.json(job)
  }

  if (!notetakerId || !grantId) {
    return NextResponse.json({ error: 'Missing notetakerId or grantId' }, { status: 400 })
  }

  // Generate a unique job ID
  const newJobId = Date.now().toString()
  downloadJobs.set(newJobId, { status: 'processing' })

  // Start the download process asynchronously
  fetchRecording(grantId, notetakerId, newJobId).catch(console.error)

  return NextResponse.json({ jobId: newJobId, status: 'processing' })
}

async function fetchRecording(grantId: string, notetakerId: string, jobId: string) {
  try {
    const response = await fetch(`https://api-staging.us.nylas.com/v3/grants/${grantId}/notetakers/${notetakerId}/media`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, application/gzip',
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch recording: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.recording_url) {
      throw new Error('No recording URL found in Nylas API response')
    }

    // Update job status with the recording URL
    downloadJobs.set(jobId, { status: 'completed', url: data.recording_url })
  } catch (error) {
    console.error('Error fetching recording:', error)
    downloadJobs.set(jobId, { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
  }
}

