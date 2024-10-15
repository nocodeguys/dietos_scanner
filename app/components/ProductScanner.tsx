'use client'

import React, { useState, useRef } from 'react'
import { scanImage, checkScanStatus, ScanStatusResponse } from '../utils/imageProcessing'
import { ProductData } from '../types/ProductData'

export default function ProductScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ProductData | null>(null)
  const [savedToDatabase, setSavedToDatabase] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanId, setScanId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setScanning(true)
      setError(null)
      setSavedToDatabase(false)
      setResult(null)
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
      const response = await checkScanStatus(id)
      if (response.status === 'completed') {
        setResult(response.scannedData!)
        setSavedToDatabase(!!response.savedData)
        setScanId(null)
      } else if (response.status === 'processing') {
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
    <div className="w-full max-w-md">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        ref={fileInputRef}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:bg-blue-300"
        disabled={scanning || !!scanId}
      >
        {scanning ? 'Initiating Scan...' : scanId ? 'Processing...' : 'Scan Product'}
      </button>
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      {scanId && (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Scan in progress. This may take a few moments...
        </div>
      )}
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Scanned Result:</h2>
          <div className="bg-gray-100 p-4 rounded mt-2">
            <p><strong>Name:</strong> {result.name}</p>
            <p><strong>Price:</strong> {result.price !== null ? `$${result.price.toFixed(2)}` : 'Not available'}</p>
            <p><strong>Ingredients:</strong> {result.ingredients.length > 0 ? result.ingredients.join(', ') : 'Not available'}</p>
            <p><strong>Macronutrients:</strong></p>
            <ul className="list-disc list-inside pl-4">
              <li>Calories: {result.macronutrients.calories}</li>
              <li>Protein: {result.macronutrients.protein}g</li>
              <li>Carbohydrates: {result.macronutrients.carbohydrates}g</li>
              <li>Fat: {result.macronutrients.fat}g</li>
            </ul>
            {result.vitamins && Object.keys(result.vitamins).length > 0 ? (
              <>
                <p><strong>Vitamins:</strong></p>
                <ul className="list-disc list-inside pl-4">
                  {Object.entries(result.vitamins).map(([vitamin, amount]) => (
                    <li key={vitamin}>{vitamin}: {amount}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p><strong>Vitamins:</strong> Not available</p>
            )}
          </div>
          {savedToDatabase && (
            <div className="mt-2 p-2 bg-green-100 text-green-700 rounded">
              Product successfully saved to database.
            </div>
          )}
        </div>
      )}
    </div>
  )
}