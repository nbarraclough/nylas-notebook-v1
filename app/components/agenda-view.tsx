'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { toast } from 'react-toastify'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"


interface ApiCall {
  method: string;
  url: string;
  headers: Record<string, string>;
  response: string;
}

interface Event {
  id: string
  title: string
  when: {
    start_time: number | string
    end_time: number | string
    start_date?: string
    end_date?: string
  }
  conferencing?: {
    provider: string
    details: {
      meeting_code: string
      password: string
      url: string
    }
  }
}

interface AgendaViewProps {
  grantId: string
  addApiCall: (call: ApiCall) => void
  onSendNotetaker: (eventId: string, eventName: string, meetingLink: string) => Promise<any>
}

export function AgendaView({ grantId, addApiCall, onSendNotetaker }: AgendaViewProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [grantId])

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const startTime = Math.floor(today.getTime() / 1000)
      const endTime = Math.floor(tomorrow.getTime() / 1000)

      const url = `https://api-staging.us.nylas.com/v3/grants/${grantId}/events?calendar_id=primary&start=${startTime}&end=${endTime}`
      
      const headers = {
        'Accept': 'application/json, application/gzip',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_NYLAS_API_KEY}`,
        'Content-Type': 'application/json'
      }

      addApiCall({
        method: 'GET',
        url,
        headers,
        response: JSON.stringify({ events: [] }) // Placeholder response
      })

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        addApiCall({
          method: 'GET',
          url,
          headers,
          response: JSON.stringify({ error: errorData.error || 'Failed to fetch events' })
        })
        throw new Error(errorData.error || 'Failed to fetch events')
      }

      const data = await response.json()
      addApiCall({
        method: 'GET',
        url,
        headers,
        response: JSON.stringify(data)
      })
      setEvents(data.data)
    } catch (error) {
      console.error('Error fetching events:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast.error('Failed to fetch events. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (start: number | string, end: number | string) => {
    // Helper function to check if a date string is in YYYY-MM-DD format
    const isAllDay = (date: string) => {
      return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
    };

    // Helper function to check if a date is valid
    const isValidDate = (date: Date) => {
      return date instanceof Date && !isNaN(date.getTime());
    };

    try {
      // Handle string dates
      if (typeof start === 'string' && typeof end === 'string') {
        // Check for all-day event format
        if (isAllDay(start) && isAllDay(end)) {
          return "All day";
        }

        // Parse dates
        const startDate = new Date(start);
        const endDate = new Date(end);

        // Check if dates are valid
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
          return "All day";
        }

        return `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      }

      // Handle timestamp (number) case
      const startDate = new Date(typeof start === 'number' ? start * 1000 : start);
      const endDate = new Date(typeof end === 'number' ? end * 1000 : end);

      // Check if dates are valid
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        return "All day";
      }

      return `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } catch (error) {
      // If any error occurs during date parsing/formatting, return "All day"
      return "All day";
    }
  };

  const joinCallAndBringNotetaker = async (event: Event) => {
    try {
      if (!event.conferencing?.details?.url) {
        throw new Error('No conferencing URL found for this event')
      }
      console.log('Joining call for event:', event)
      const response = await onSendNotetaker(event.id, event.title, event.conferencing.details.url)
      if (response.error) {
        throw new Error(response.error)
      }
      // Open the meeting URL in a new tab
      window.open(event.conferencing.details.url, '_blank')
      toast.success('Notetaker sent and joining the call!')
    } catch (error) {
      console.error('Error joining call and bringing notetaker:', error)
      let errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('No conferencing URL found for this event')) {
        errorMessage = 'This event does not have a conferencing URL. Please add a meeting link to the event and try again.'
      } else if (errorMessage.includes('Failed to fetch event details')) {
        errorMessage = 'Failed to fetch event details. Please check your internet connection and try again.'
      }
      toast.error(`Failed to join call and bring notetaker: ${errorMessage}. Please try again.`)
    }
  }

  const hasMeetingLink = (event: Event) => {
    return event.conferencing?.details?.url && 
    (event.conferencing.details.url.startsWith('http://') || 
     event.conferencing.details.url.startsWith('https://'))
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading events...</div>
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchEvents} className="bg-blue-500 hover:bg-blue-600 text-white">Retry</Button>
      </div>
    )
  }

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Event</TableHead>
                <TableHead className="w-1/4">Time</TableHead>
                <TableHead className="w-1/4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">No events scheduled for today.</TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{formatTime(event.when.start_time, event.when.end_time)}</TableCell>
                    <TableCell>
                      {hasMeetingLink(event) ? (
                        <Button onClick={() => joinCallAndBringNotetaker(event)} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white w-full">
                          Join
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-500">No meeting link</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

