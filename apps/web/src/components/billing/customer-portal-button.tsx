'use client'

import { useState } from 'react'
import { Button } from '@live-translator/ui/components/button'

export function CustomerPortalButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handlePortal = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/app/billing`,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No portal URL returned')
        alert('Failed to open customer portal. Please try again.')
      }
    } catch (error) {
      console.error('Customer portal error:', error)
      alert('Failed to open customer portal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handlePortal} disabled={isLoading}>
      {isLoading ? 'Opening...' : 'Open Customer Portal'}
    </Button>
  )
}