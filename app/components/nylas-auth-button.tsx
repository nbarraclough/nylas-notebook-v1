'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { toast } from 'react-toastify'

interface ApiCall {
  method: string;
  url: string;
  headers: {};
  response: string;
}

interface NylasAuthButtonProps {
  onAuthSuccess: (grantId: string) => void
  addApiCall: (call: ApiCall) => void
}

export function NylasAuthButton({ onAuthSuccess, addApiCall }: NylasAuthButtonProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === 'NYLAS_AUTH_SUCCESS') {
        console.log('Authentication successful. Grant ID received:', event.data.grantId)
        setIsAuthenticating(false)
        onAuthSuccess(event.data.grantId)
        toast.success('Authentication successful')
      } else if (event.data.type === 'NYLAS_AUTH_ERROR') {
        console.error('Authentication failed:', event.data.error)
        setIsAuthenticating(false)
        toast.error(`Authentication failed: ${event.data.error}`)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onAuthSuccess])

  const handleAuth = async () => {
    setIsAuthenticating(true)
    console.log('Initiating Nylas authentication')
    try {
      const response = await fetch('/api/nylas-auth', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.authUrl) {
        addApiCall({
          method: 'POST',
          url: '/api/nylas-auth',
          headers: {},
          response: JSON.stringify(data)
        })
        console.log('Received auth URL:', data.authUrl)
        console.log('Opening Nylas auth window with URL:', data.authUrl)
        const authWindow = window.open(data.authUrl, 'NylasAuth', 'width=600,height=600')
        if (authWindow) {
          const checkClosed = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkClosed)
              setIsAuthenticating(false)
              console.log('Nylas auth window closed')
            }
          }, 500)
        }
      } else if (data.error) {
        console.error('Error initiating authentication:', data.error)
        toast.error(`Authentication failed: ${data.error}. Please try again later.`)
        setIsAuthenticating(false)
      }
    } catch (error) {
      console.error('Error initiating authentication:', error)
      addApiCall({
        method: 'POST',
        url: '/api/nylas-auth',
        headers: {},
        response: JSON.stringify({ error: 'Failed to initiate authentication' })
      })
      toast.error('Failed to initiate authentication. Please check your network connection and try again.')
      setIsAuthenticating(false)
    }
  }

  return (
    <Button
      onClick={handleAuth}
      disabled={isAuthenticating}
      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-lg border-0 text-white"
    >
      {isAuthenticating ? 'Authenticating...' : 'Authenticate with Nylas'}
    </Button>
  )
}

