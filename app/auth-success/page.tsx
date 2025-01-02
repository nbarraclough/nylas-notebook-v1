'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from 'lucide-react'

export default function AuthSuccess() {
  useEffect(() => {
    // Close the window after a short delay if it's a popup
    if (window.opener) {
      setTimeout(() => {
        window.close()
      }, 1000)
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400">
      <Card className="w-full max-w-md bg-white shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">Authentication Successful</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-600">
          You can now close this window and return to the application.
        </CardContent>
      </Card>
    </div>
  )
}

