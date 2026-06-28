import { useEffect, useState } from 'react'

interface PlayerPhotoProps {
  name: string
  className?: string
}

function nameToFilename(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_') + '.png'
}

export default function PlayerPhoto({ name, className = '' }: PlayerPhotoProps) {
  const [error, setError] = useState(false)
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
  const src = `${base}/photos/${nameToFilename(name)}`

  // Reset the fallback when the player (and therefore the src) changes
  useEffect(() => {
    setError(false)
  }, [src])

  if (error) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center rounded-lg ${className}`}
        title={name}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="text-gray-400"
          style={{ width: '40%', height: '40%' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className={`object-cover rounded-lg ${className}`}
      onError={() => setError(true)}
    />
  )
}
