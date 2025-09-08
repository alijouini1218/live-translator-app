'use client'

import { useEffect, useRef } from 'react'

interface AudioVisualizerProps {
  isActive: boolean
  audioLevel?: number
  className?: string
}

export function AudioVisualizer({ isActive, audioLevel = 0, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      if (!isActive) {
        // Draw static bars when inactive
        const barCount = 20
        const barWidth = width / barCount - 2
        
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + 2)
          const barHeight = 4
          const y = (height - barHeight) / 2
          
          ctx.fillStyle = '#d1d5db'
          ctx.fillRect(x, y, barWidth, barHeight)
        }
      } else {
        // Draw animated waveform when active
        const barCount = 20
        const barWidth = width / barCount - 2
        const maxHeight = height * 0.8
        
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + 2)
          
          // Create pseudo-random animation based on audio level and time
          const time = Date.now() * 0.005
          const wave = Math.sin(time + i * 0.5) * 0.5 + 0.5
          const levelInfluence = audioLevel * 0.7 + 0.3
          const barHeight = Math.max(4, maxHeight * wave * levelInfluence)
          
          const y = (height - barHeight) / 2
          
          // Color based on activity level
          const intensity = Math.min(1, audioLevel * 2)
          const red = Math.floor(intensity * 255)
          const green = Math.floor((1 - intensity) * 255)
          ctx.fillStyle = `rgb(${red}, ${green}, 0)`
          
          ctx.fillRect(x, y, barWidth, barHeight)
        }
      }
      
      if (isActive) {
        animationRef.current = requestAnimationFrame(draw)
      }
    }

    if (isActive) {
      draw()
    } else {
      draw()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, audioLevel])

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={`${className}`}
      style={{ width: '200px', height: '60px' }}
    />
  )
}