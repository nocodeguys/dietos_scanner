'use client'

import React, { useState, useRef } from 'react'
import { scanImage, checkScanStatus } from '../utils/imageProcessing'
import { ProductData } from '../types/ProductData'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Camera, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface ScanStatusResponse {
  status: 'processing' | 'completed' | 'failed';
  scannedData?: ProductData;
  savedData?: boolean;
  error?: string;
}

export default function ProductScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ProductData | null>(null)
  const [savedToDatabase, setSavedToDatabase] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanId, setScanId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setScanning(true)
      setError(null)
      setSavedToDatabase(false)
      setResult(null)
      setProgress(0)
      try {
        const { scanId } = await scanImage(file)
        setScanId(scanId)
        await pollScanStatus(scanId)
      } catch (error) {
        console.error('Error initiating scan:', error)
        setError('Failed to initiate scan. Please try again.')
      }
      setScanning(false)
    }
  }

  const pollScanStatus = async (id: string) => {
    try {
      const response: ScanStatusResponse = await checkScanStatus(id)
      if (response.status === 'completed' && response.scannedData) {
        setResult(response.scannedData)
        setSavedToDatabase(!!response.savedData)
        setScanId(null)
        setProgress(100)
      } else if (response.status === 'processing') {
        setProgress((prev) => Math.min(prev + 10, 90))
        setTimeout(() => pollScanStatus(id), 5000) // Poll every 5 seconds
      } else {
        throw new Error(response.error || 'Scan failed')
      }
    } catch (error) {
      console.error('Error checking scan status:', error)
      setError('Failed to retrieve scan results. Please try again.')
      setScanId(null)
    }
  }

  return (
    <Card className="w-full max-w-[95%] md:max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Product Scanner</CardTitle>
        <CardDescription>Scan a product label to get detailed information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          ref={fileInputRef}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
          disabled={scanning || !!scanId}
        >
          {scanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initiating Scan...
            </>
          ) : scanId ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Scan Product
            </>
          )}
        </Button>
        {error && (
          <div className="p-4 bg-destructive/15 text-destructive rounded-md">
            <AlertCircle className="inline-block mr-2 h-4 w-4" />
            <strong>Error:</strong> {error}
          </div>
        )}
        {scanId && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Scan in progress. This may take a few moments...
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
        {result && (
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
        {savedToDatabase && (
          <div className="p-2 bg-green-100 text-green-700 rounded-md">
            <CheckCircle className="inline-block mr-2 h-4 w-4" />
            Product successfully saved to database.
          </div>
        )}
      </CardContent>
    </Card>
  )
}