'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Something went wrong</h1>
            <p style={{ marginTop: '0.5rem', color: '#666' }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={() => unstable_retry()}
              style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', backgroundColor: '#2D6A9F', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
