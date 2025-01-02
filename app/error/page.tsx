'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('message') || 'An unknown error occurred'

  return (
    <Card className="w-full max-w-md bg-white shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-red-700">Authentication Error</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-gray-600">{errorMessage}</p>
        <p className="mt-4 text-sm text-gray-500">
          Please close this window and try again.
        </p>
      </CardContent>
    </Card>
  )
}

export default function ErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  )
}

