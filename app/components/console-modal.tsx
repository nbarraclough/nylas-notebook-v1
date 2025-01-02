'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ApiCall {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  response: string
}

interface ConsoleModalProps {
  isOpen: boolean
  onClose: () => void
  apiCalls: ApiCall[]
  className?: string
}

const redactSensitiveInfo = (key: string, value: any): any => {
  if (key === 'Authorization' && typeof value === 'string') {
    return value.replace(/Bearer\s+[^\s]+/, 'Bearer <REDACTED>');
  }
  return value;
};

function PrettyPrintJson({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpand = () => setIsExpanded(!isExpanded)

  const renderValue = (key: string, value: any): JSX.Element => {
    const redactedValue = redactSensitiveInfo(key, value);
    if (typeof redactedValue === 'string') {
      return <span className="text-green-400">{JSON.stringify(redactedValue)}</span>
    } else if (typeof redactedValue === 'number') {
      return <span className="text-yellow-400">{redactedValue}</span>
    } else if (typeof redactedValue === 'boolean') {
      return <span className="text-purple-400">{redactedValue.toString()}</span>
    } else if (redactedValue === null) {
      return <span className="text-red-400">null</span>
    } else if (Array.isArray(redactedValue)) {
      return (
        <span>
          [
          {redactedValue.map((item, index) => (
            <span key={index}>
              {renderValue(`${key}[${index}]`, item)}
              {index < redactedValue.length - 1 && ', '}
            </span>
          ))}
          ]
        </span>
      )
    } else if (typeof redactedValue === 'object') {
      return <PrettyPrintJson data={redactedValue} />
    }
    return <span>{String(redactedValue)}</span>
  }

  if (typeof data !== 'object' || data === null) {
    return <span>{JSON.stringify(data)}</span>
  }

  return (
    <div className="pl-4 border-l border-gray-700">
      <span className="cursor-pointer" onClick={toggleExpand}>
        {isExpanded ? <ChevronDown className="inline w-4 h-4" /> : <ChevronRight className="inline w-4 h-4" />}
        {' {'}
      </span>
      {isExpanded && (
        <div className="pl-4">
          {Object.entries(data).map(([key, value], index) => (
            <div key={key}>
              <span className="text-blue-400">"{key}"</span>: {renderValue(key, value)}
              {index < Object.entries(data).length - 1 && ','}
            </div>
          ))}
        </div>
      )}
      <span>{isExpanded && <br />}{'}'}</span>
    </div>
  )
}

export function ConsoleModal({ isOpen, onClose, apiCalls, className = '' }: ConsoleModalProps) {
  const [isVisible, setIsVisible] = useState(isOpen)
  const [width, setWidth] = useState(400)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    setIsVisible(isOpen)
  }, [isOpen])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newWidth = window.innerWidth - e.clientX
      setWidth(Math.max(300, Math.min(newWidth, window.innerWidth - 100)))
    }
  }, [isDragging])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!isVisible) return null

  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-gray-900 text-white shadow-lg overflow-hidden transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'} ${className}`}
      style={{ width: `${width}px` }}
    >
      <div 
        className="absolute top-0 left-0 w-6 h-full cursor-ew-resize bg-blue-500 opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>
      <div className="flex justify-between items-center p-4 border-b border-gray-700 ml-6">
        <h2 className="text-xl font-bold">Console</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-6 w-6" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-64px)] p-4 ml-6">
        {apiCalls.map((call, index) => (
          <div key={index} className="mb-6 font-mono text-sm">
            <div className="text-yellow-400 mb-2">Request #{index + 1}:</div>
            <div className="overflow-x-auto">
              <PrettyPrintJson
                data={{
                  method: call.method,
                  url: call.url,
                  headers: call.headers,
                  ...(call.body && { body: JSON.parse(call.body) }),
                }}
              />
            </div>
            <div className="text-yellow-400 mt-4 mb-2">Response:</div>
            <div className="overflow-x-auto">
              <PrettyPrintJson data={JSON.parse(call.response)} />
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}

