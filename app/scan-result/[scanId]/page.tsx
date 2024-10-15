'use client'

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from 'next/navigation'
import { checkScanStatus } from '../../utils/imageProcessing'
import { ProductData } from '../../types/ProductData'

interface ScanStatusResponse {
  status: 'processing' | 'completed' | 'failed';
  scannedData?: ProductData;
  savedData?: boolean;
  error?: string;
}

export default function ScanResult({ params }: { params: { scanId: string } }) {
  const [scanState, setScanState] = useState<'processing' | 'complete' | 'error'>('processing')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ProductData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedToDatabase, setSavedToDatabase] = useState(false)
  const router = useRouter()

  useEffect(() => {
    pollScanStatus(params.scanId)
  }, [params.scanId])

  const pollScanStatus = async (id: string) => {
    try {
      const response: ScanStatusResponse = await checkScanStatus(id)
      if (response.status === 'completed' && response.scannedData) {
        setResult(response.scannedData)
        setSavedToDatabase(!!response.savedData)
        setProgress(100)
        setScanState('complete')
      } else if (response.status === 'processing') {
        setProgress((prev) => Math.min(prev + 10, 90))
        setTimeout(() => pollScanStatus(id), 5000) // Poll every 5 seconds
      } else {
        throw new Error(response.error || 'Scan failed')
      }
    } catch (error) {
      console.error('Error checking scan status:', error)
      setError('Failed to retrieve scan results. Please try again.')
      setScanState('error')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
          <div className="flex flex-1 items-center justify-center">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <span className="font-bold">DietOS Scanner</span>
            </nav>
          </div>
          <Avatar>
            <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start p-4">
        <Card className="w-full max-w-[95%] md:max-w-2xl mt-4">
          <CardHeader>
            <CardTitle>Scan Result</CardTitle>
            <CardDescription>Detailed information about the scanned product</CardDescription>
          </CardHeader>
          <CardContent>
            {scanState === 'processing' && (
              <div className="space-y-4">
                <Progress value={progress} className="w-full" />
                <p className="text-center text-sm text-muted-foreground">
                  Processing image...
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  This may take a few moments. Please wait.
                </p>
              </div>
            )}
            {scanState === 'complete' && result && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{result.name}</h3>
                  {result.price !== null && <Badge variant="secondary">${result.price.toFixed(2)}</Badge>}
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Ingredients</h4>
                  <p className="text-sm text-muted-foreground">{result.ingredients.join(", ")}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Macronutrients</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>Calories: {result.macronutrients.calories}</p>
                    <p>Protein: {result.macronutrients.protein}g</p>
                    <p>Carbohydrates: {result.macronutrients.carbohydrates}g</p>
                    <p>Fat: {result.macronutrients.fat}g</p>
                  </div>
                </div>
                {result.vitamins && Object.keys(result.vitamins).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Vitamins & Minerals</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(result.vitamins).map(([vitamin, amount]) => (
                          <p key={vitamin}>{vitamin}: {amount}</p>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {scanState === 'error' && (
              <div className="text-center text-red-500">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>{error || 'An error occurred during scanning. Please try again.'}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {scanState === 'complete' && savedToDatabase && (
              <p className="text-sm text-muted-foreground w-full text-center">
                <CheckCircle className="inline-block mr-2 h-4 w-4 text-green-500" />
                Product successfully saved to database
              </p>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}