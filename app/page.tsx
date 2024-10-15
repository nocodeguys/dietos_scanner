'use client'

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Scan } from "lucide-react"
import ProductScanner from './components/ProductScanner'

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x: number; y: number; radius: number; vx: number; vy: number }[] = []
    const particleCount = 100

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        vx: Math.random() * 0.5 - 0.25,
        vy: Math.random() * 0.5 - 0.25
      })
    }

    function animate() {
      if (!canvas || !ctx) return;
      requestAnimationFrame(animate)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(particle => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > canvas.width) particle.vx = -particle.vx
        if (particle.y < 0 || particle.y > canvas.height) particle.vy = -particle.vy

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)'
        ctx.fill()
      })
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleScanClick = () => {
    setShowScanner(true)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="flex flex-1 items-center justify-center">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <a href="/" className="flex items-center space-x-2">
                <span className="font-bold">DietOS Scanner</span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        {!showScanner ? (
          <>
            <h1 className="text-4xl font-bold mb-4 text-center">What do you want to scan?</h1>
            <p className="text-center text-lg text-muted-foreground max-w-md mb-8">
              Scan product labels to add them to our database. Manage your scanned products in your web app account.
            </p>
            <Button 
              size="lg" 
              className="bg-black text-white hover:bg-gray-800 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={handleScanClick}
            >
              <Scan className="mr-2 h-5 w-5" /> Scan your label
            </Button>
          </>
        ) : (
          <ProductScanner />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 relative z-10">
        <div className="container flex flex-col items-center justify-center gap-2 text-center">
          <Badge variant="outline">Beta v1.0</Badge>
        </div>
      </footer>
    </div>
  )
}
