'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check } from 'lucide-react'
import { toast } from 'react-toastify'

interface CopyableFieldProps {
  label: string
  value: string
}

export function CopyableField({ label, value }: CopyableFieldProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setIsCopied(true)
      toast.success('Copied to clipboard!', {
        autoClose: 2000,
      })
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy. Please try again.', {
        autoClose: 2000,
      })
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={label} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex">
        <Input
          type="text"
          id={label}
          value={value}
          readOnly
          className="h-12 rounded-r-none font-mono text-sm bg-gray-50 border-gray-200"
        />
        <Button
          type="button"
          onClick={handleCopy}
          className={`h-12 px-4 rounded-l-none transition-all duration-300 border-0 ${
            isCopied 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
          aria-label="Copy to clipboard"
        >
          {isCopied ? (
            <Check className="h-5 w-5 text-white" />
          ) : (
            <Copy className="h-5 w-5 text-white" />
          )}
        </Button>
      </div>
    </div>
  )
}

