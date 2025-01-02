'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { CopyableField } from './copyable-field'
import { Pencil, Download, Terminal, LogOut, Calendar } from 'lucide-react'
import { ConsoleModal } from './console-modal'
import { NylasAuthButton } from './nylas-auth-button'
import { AgendaView } from './agenda-view'
import { Textarea } from "@/components/ui/textarea"

interface NotetakerRecord {
  id: string;
  timestamp: number;
  eventId: string;
  eventName: string;
}

interface ApiCall {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  response: string
}

export default function MeetingBotForm() {
  const [meetingLink, setMeetingLink] = useState('')
  const [notetakerName, setNotetakerName] = useState("Nylas Notetaker")
  const [isSendingNotetaker, setIsSendingNotetaker] = useState(false)
  const [downloadingStates, setDownloadingStates] = useState<Record<string, boolean>>({})
  const [notetakerId, setNotetakerId] = useState<string | null>(null)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [timer, setTimer] = useState(0)
  const [hasLeftMeeting, setHasLeftMeeting] = useState(false)
  const [previousNotetakers, setPreviousNotetakers] = useState<NotetakerRecord[]>([])
  const [showPreviousRecordings, setShowPreviousRecordings] = useState(false)
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  const [consoleWidth, setConsoleWidth] = useState(400)
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([])
  const [grantId, setGrantId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [currentEventName, setCurrentEventName] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [downloadJobs, setDownloadJobs] = useState<Record<string, { jobId: string, status: string }>>({})

  useEffect(() => {
    const storedNotetakers = localStorage.getItem('previousNotetakers')
    if (storedNotetakers) {
      setPreviousNotetakers(JSON.parse(storedNotetakers))
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true)
      try {
        const response = await fetch('/api/nylas-auth-check')
        const data = await response.json()
        setIsAuthenticated(data.authenticated)
        if (data.authenticated && data.grantId) {
          setGrantId(data.grantId)
        }
      } catch (error) {
        console.error('Error checking authentication:', error)
        toast.error('Failed to verify authentication. Please try again.')
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (notetakerId && !hasLeftMeeting) {
        e.preventDefault()
        e.returnValue = 'Closing this tab will make Notetaker leave your call'
      }
    }

    const handleUnload = async () => {
      if (notetakerId && !hasLeftMeeting && grantId) {
        await fetch('/api/leave-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notetakerId, grantId }),
          keepalive: true
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
    }
  }, [notetakerId, hasLeftMeeting, grantId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (notetakerId && hasLeftMeeting && !recordingUrl) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [notetakerId, hasLeftMeeting, recordingUrl])

  const addApiCall = (call: ApiCall) => {
    setApiCalls(prevCalls => [...prevCalls, call])
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grantId) {
      toast.error('Please authenticate with Nylas first')
      return
    }
    setIsSendingNotetaker(true)

    try {
      const extractMeetingLink = (input: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const matches = input.match(urlRegex)
        if (matches && matches.length > 0) {
          return matches[0]
        }
        return input.trim()
      }

      const extractedLink = extractMeetingLink(meetingLink)
      const formattedMeetingLink = extractedLink.startsWith('http://') || extractedLink.startsWith('https://')
        ? extractedLink
        : `https://${extractedLink}`

      const requestBody = JSON.stringify({
        meetingLink: formattedMeetingLink,
        notetakerName,
        grantId
      })

      const apiCall: ApiCall = {
        method: 'POST',
        url: '/api/send-notetaker',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
        response: ''
      }

      const response = await fetch('/api/send-notetaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      })

      const responseText = await response.text()
      apiCall.response = responseText
      addApiCall(apiCall)

      console.log('Raw API response:', responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError)
        if (responseText.includes("notetaker is joining meeting, please wait...")) {
          toast.info("Notetaker is joining your call, it takes about a minute to join.", {
            autoClose: false,
            closeOnClick: false,
          })
          return
        }
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      if (!response.ok) {
        throw new Error(`API error (${response.status}): ${JSON.stringify(data)}`)
      }

      if (data.error === "Invalid response from Nylas API" && data.details === "notetaker is joining meeting, please wait...") {
        toast.info("Notetaker is joining your call, it takes about a minute to join.", {
          autoClose: false,
          closeOnClick: false,
        })
        return
      }

      if (!data.data || !data.data.notetaker_id) {
        throw new Error(`Notetaker ID not received: ${JSON.stringify(data)}`)
      }

      const newNotetakerId = data.data.notetaker_id
      setNotetakerId(newNotetakerId)
      setCurrentEventName('Manual Meeting')
      const updatedNotetakers = [...previousNotetakers, { 
        id: newNotetakerId, 
        timestamp: Date.now(),
        eventId: 'manual',
        eventName: 'Manual Meeting'
      }]
      setPreviousNotetakers(updatedNotetakers)
      localStorage.setItem('previousNotetakers', JSON.stringify(updatedNotetakers))
      toast.success(`Notetaker is joining the call!`, {
        autoClose: false,
        closeOnClick: false,
      })
      setMeetingLink('')
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      let errorMessage = 'An unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('Error stack:', error.stack)
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
      }
      if (errorMessage.includes('Notetaker ID not received')) {
        const match = errorMessage.match(/"notetaker_id":"([^"]+)"/)
        if (match && match[1]) {
          setNotetakerId(match[1])
          toast.success(`Notetaker is joining the call!`, {
            autoClose: false,
            closeOnClick: false,
          })
        } else {
          toast.error('Failed to parse notetaker ID from response', {
            autoClose: false,
            closeOnClick: false,
          })
        }
      } else if (errorMessage.includes('notetaker already exists')) {
        toast.error('Notetaker can only join calls once. Try starting a new call', {
          autoClose: false,
          closeOnClick: false,
        })
      } else {
        toast.error(`Failed to send notetaker: ${errorMessage}`, {
          autoClose: false,
          closeOnClick: false,
        })
      }
    } finally {
      setIsSendingNotetaker(false)
    }
  }, [meetingLink, notetakerName, grantId, previousNotetakers])

  const handleLeaveMeeting = async () => {
    if (!notetakerId || !grantId) return

    try {
      const apiCall: ApiCall = {
        method: 'POST',
        url: '/api/leave-meeting',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notetakerId, grantId }),
        response: ''
      }

      const response = await fetch('/api/leave-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notetakerId, grantId }),
      })

      const responseText = await response.text()
      apiCall.response = responseText
      addApiCall(apiCall)

      if (!response.ok) {
        const errorData = JSON.parse(responseText)
        throw new Error(errorData.details || 'Failed to make notetaker leave')
      }

      setHasLeftMeeting(true)
      setTimer(0)
      toast.success('Notetaker has left the meeting', {
        autoClose: false,
        closeOnClick: false,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      toast.error(`Failed to make notetaker leave: ${errorMessage}. Please try again.`, {
        autoClose: false,
        closeOnClick: false,
      })
      console.error('Error:', error)
    }
  }

  const handleDownloadRecording = async (id: string) => {
    if (!grantId) return;

    try {
      setDownloadingStates((prev) => ({ ...prev, [id]: true }));
      setDownloadProgress((prev) => ({ ...prev, [id]: 0 }));
      console.log(`Initiating download for recording ${id}`);

      // Initiate the download job
      const response = await fetch(`/api/get-recording-link?notetakerId=${id}&grantId=${grantId}`);

      if (!response.ok) {
        throw new Error(`Failed to initiate download: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.jobId) {
        setDownloadJobs((prev) => ({ ...prev, [id]: { jobId: data.jobId, status: 'processing' } }));
        pollDownloadStatus(id, data.jobId);
      } else {
        throw new Error('No job ID received from the server');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Download error:', errorMessage);
      toast.error(`Failed to initiate download: ${errorMessage}. Please try again.`, {
        autoClose: false,
        closeOnClick: false,
      });
    } finally {
      setDownloadingStates((prev) => ({ ...prev, [id]: false }));
    }
  };

  const pollDownloadStatus = async (id: string, jobId: string) => {
    try {
      const response = await fetch(`/api/get-recording-link?jobId=${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to check download status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'completed' && data.url) {
        setDownloadJobs((prev) => ({ ...prev, [id]: { ...prev[id], status: 'completed' } }));
        // Trigger the actual download
        const a = document.createElement('a');
        a.href = data.url;
        a.download = `recording_${id}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Download completed successfully.');
      } else if (data.status === 'error') {
        throw new Error(data.error || 'An error occurred during download');
      } else {
        // Still processing, poll again after a delay
        setTimeout(() => pollDownloadStatus(id, jobId), 5000);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Download status check error:', errorMessage);
      toast.error(`Download failed: ${errorMessage}. Please try again.`, {
        autoClose: false,
        closeOnClick: false,
      });
      setDownloadJobs((prev) => ({ ...prev, [id]: { ...prev[id], status: 'error' } }));
    }
  };

  const handleShareRecording = async (id: string) => {
    if (!grantId) return

    try {
      setDownloadingStates((prev) => ({ ...prev, [id]: true }));

      const response = await fetch(`/api/get-recording-link?notetakerId=${id}&grantId=${grantId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch recording link: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.jobId) {
        // If we get a job ID, we need to poll for the result
        await pollForRecordingLink(id, data.jobId);
      } else if (data.url) {
        // If we get the URL directly, we can copy it immediately
        await copyToClipboard(data.url);
      } else {
        throw new Error('No recording URL or job ID found in the response');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to share recording link: ${errorMessage}. Please try again.`, {
        autoClose: false,
        closeOnClick: false,
      });
      console.error('Error:', error);
    } finally {
      setDownloadingStates((prev) => ({ ...prev, [id]: false }));
    }
  };

  const pollForRecordingLink = async (id: string, jobId: string) => {
    const maxAttempts = 10;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/get-recording-link?jobId=${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to check recording link status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'completed' && data.url) {
        await copyToClipboard(data.url);
        return;
      } else if (data.status === 'error') {
        throw new Error(data.error || 'An error occurred while fetching the recording link');
      }

      // If not complete, wait before trying again
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Timed out while waiting for the recording link');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Recording link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy to clipboard. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleAuthSuccess = useCallback((newGrantId: string) => {
    setGrantId(newGrantId)
    setIsAuthenticated(true)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
      setIsAuthenticated(false)
      setGrantId(null)
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error('Failed to log out. Please try again.')
    }
  }

  const handleSendNotetaker = async (eventId: string, eventName: string, meetingLink: string) => {
    if (!grantId) {
      toast.error('Please authenticate with Nylas first')
      return
    }
    setIsSendingNotetaker(true)

    try {
      const requestBody = JSON.stringify({
        eventId,
        notetakerName,
        grantId,
        meetingLink
      })

      const apiCall: ApiCall = {
        method: 'POST',
        url: '/api/send-notetaker',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
        response: ''
      }

      const response = await fetch('/api/send-notetaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      })

      const responseText = await response.text()
      apiCall.response = responseText
      addApiCall(apiCall)

      console.log('Raw API response:', responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      if (!response.ok) {
        throw new Error(`API error (${response.status}): ${JSON.stringify(data)}`)
      }

      if (!data.data || !data.data.notetaker_id) {
        throw new Error(`Notetaker ID not received: ${JSON.stringify(data)}`)
      }

      const newNotetakerId = data.data.notetaker_id
      setNotetakerId(newNotetakerId)
      setCurrentEventName(eventName)
      const updatedNotetakers = [...previousNotetakers, { 
        id: newNotetakerId, 
        timestamp: Date.now(),
        eventId,
        eventName
      }]
      setPreviousNotetakers(updatedNotetakers)
      localStorage.setItem('previousNotetakers', JSON.stringify(updatedNotetakers))
      toast.success(`Notetaker is joining the call!`, {
        autoClose: false,
        closeOnClick: false,
      })
      return data
    } catch (error) {
      console.error('Error in handleSendNotetaker:', error)
      let errorMessage = 'An unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
      }
      toast.error(`Failed to send notetaker: ${errorMessage}`, {
        autoClose: false,
        closeOnClick: false,
      })
      throw error
    } finally {
      setIsSendingNotetaker(false)
    }
  }

  const handleConsoleResize = (newWidth: number) => {
    setConsoleWidth(newWidth)
  }

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400">
        <Card className="w-full max-w-md bg-white shadow-lg p-8 text-center">
          <CardTitle className="text-2xl mb-4">Checking authentication...</CardTitle>
          <CardDescription>Please wait while we verify your session.</CardDescription>
        </Card>
      </div>
    )
  }

  const mainContentWidth = isConsoleOpen ? `calc(100% - ${consoleWidth}px)` : '100%'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 transition-all duration-300">
      <div 
        className="flex flex-col lg:flex-row items-start justify-center gap-4 w-full max-w-6xl transition-all duration-300"
        style={{ width: mainContentWidth }}
      >
        {isAuthenticated && grantId && (
          <Card className={`w-full lg:w-1/2 bg-white shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] border-0`}>
            <CardHeader className="flex flex-row items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Today's Agenda</CardTitle>
                <CardDescription className="text-base text-gray-500">
                  Join calls & bring a Notetaker with you
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <AgendaView grantId={grantId} addApiCall={addApiCall} onSendNotetaker={handleSendNotetaker} />
            </CardContent>
          </Card>
        )}
        <Card className={`w-full lg:w-1/2 bg-white shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] border-0`}>
          <CardHeader className="space-y-4 pb-6 bg-white rounded-t-lg">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg">
                <Pencil className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Meeting Notetaker</CardTitle>
                <CardDescription className="text-base text-gray-500">
                  {isAuthenticated
                    ? "Manually invite a Notetaker to your call"
                    : "Authenticate with Nylas to get started"}
                </CardDescription>
              </div>
            </div>
            {isAuthenticated && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                className="absolute top-4 right-14 text-blue-500 bg-white hover:bg-blue-50 hover:text-blue-600 border-blue-500"
              >
                <LogOut className="h-6 w-6" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
              className="absolute top-4 right-4 text-blue-500 bg-white hover:bg-blue-50 hover:text-blue-600 border-blue-500 ml-2"
            >
              <Terminal className="h-6 w-6" />
            </Button>
          </CardHeader>
          <CardContent className="pb-8 bg-white rounded-b-lg">
            {!isAuthenticated ? (
              <NylasAuthButton onAuthSuccess={handleAuthSuccess} addApiCall={addApiCall} />
            ) : (
              <>
                {!notetakerId ? (
                  <>
                    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="meeting-link" className="text-sm font-medium text-gray-700">
                            Meeting Link
                          </label>
                          <Textarea
                            id="meeting-link"
                            placeholder="Paste meeting info or enter meeting link"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            className="h-24 bg-white border-gray-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="notetaker-name" className="text-sm font-medium text-gray-700">
                            Notetaker Name
                          </label>
                          <Input
                            id="notetaker-name"
                            type="text"
                            placeholder="Enter notetaker name"
                            value={notetakerName}
                            onChange={(e) => setNotetakerName(e.target.value)}
                            required
                            className="h-12 bg-white border-gray-200"
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all duration-300 shadow-lg border-0 text-white" 
                        disabled={isSendingNotetaker}
                      >
                        {isSendingNotetaker ? 'Sending Notetaker...' : 'Send Notetaker to Meeting'}
                      </Button>
                    </form>
                  </>
                ) : (
                  <div className="space-y-6">
                    <CopyableField label="Notetaker ID" value={notetakerId} />
                    {currentEventName && (
                      <p className="text-center font-medium">Current Event: {currentEventName}</p>
                    )}
                    {!hasLeftMeeting && !recordingUrl && (
                      <Button 
                        onClick={handleLeaveMeeting} 
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg border-0 text-white"
                      >
                        Make Notetaker Leave Meeting
                      </Button>
                    )}
                    {hasLeftMeeting && !recordingUrl && (
                      <>
                        <div className="text-center space-y-2">
                          <p className="text-2xl font-bold">{formatTime(timer)}</p>
                          <p className="text-sm text-gray-500">Recordings can take up to a minute to be available</p>
                        </div>
                        <Button
                          onClick={() => handleDownloadRecording(notetakerId)}
                          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg border-0 text-white"
                          disabled={downloadingStates[notetakerId]}
                        >
                          {downloadingStates[notetakerId] ? 'Downloading...' : (
                            <>
                              <Download className="w-5 h-5 mr-2" />
                              Download Recording
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {recordingUrl && (
                      <Button
                        onClick={() => handleDownloadRecording(notetakerId)}
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg border-0 text-white"
                        disabled={downloadingStates[notetakerId]}
                      >
                        {downloadingStates[notetakerId] ? 'Downloading...' : (
                          <>
                            <Download className="w-5 h-5 mr-2" />
                            Download Recording
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {isAuthenticated && (
              <div className="mt-8 space-y-4">
                <Button
                  onClick={() => setShowPreviousRecordings(!showPreviousRecordings)}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-lg border-0 text-white"
                >
                  {showPreviousRecordings ? 'Hide Previous Recordings' : 'Show Previous Recordings'}
                </Button>

                {showPreviousRecordings && (
                  previousNotetakers.length > 0 ? (
                    <ul className="space-y-2">
                      {previousNotetakers.map((notetaker) => (
                        <li key={notetaker.id} className="flex flex-col bg-gray-100 p-3 rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-medium">{notetaker.eventName}</span>
                              <span className="text-xs text-gray-500">{new Date(notetaker.timestamp).toLocaleString()}</span>
                              <span className="text-xs text-gray-500">ID: {notetaker.id}</span>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleDownloadRecording(notetaker.id)}
                                className="h-8 px-3 text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 transition-all duration-300 shadow-md border-0 text-white"
                                disabled={downloadingStates[notetaker.id] || downloadJobs[notetaker.id]?.status === 'processing'}
                              >
                                {downloadingStates[notetaker.id] || downloadJobs[notetaker.id]?.status === 'processing' ? 'Processing...' : 'Download'}
                              </Button>
                              <Button
                                onClick={() => handleShareRecording(notetaker.id)}
                                className="h-8 px-3 text-sm font-semibold bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-md border-0 text-white"
                                disabled={downloadingStates[notetaker.id] || downloadJobs[notetaker.id]?.status === 'processing'}
                              >
                                Share Link
                              </Button>
                            </div>
                          </div>
                          {downloadJobs[notetaker.id]?.status === 'processing' && (
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div 
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 animate-pulse" 
                                style={{ width: '100%' }}
                              ></div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-gray-500">There are no recordings - how about starting one?</p>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ConsoleModal
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
        apiCalls={apiCalls}
        className="z-50"
        onResize={handleConsoleResize}
      />
      <footer className="fixed bottom-4 text-white text-sm font-medium">
        Made with 💙 by Nick & v0.dev
      </footer>
      <ToastContainer 
        position="bottom-right" 
        autoClose={false} 
        closeOnClick={false}
        theme="light"
        className="!font-sans"
      />
    </div>
  )
}

