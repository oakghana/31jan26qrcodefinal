import Image from "next/image"
import { CSSProperties } from "react"

interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Optimized Image component with automatic lazy loading,
 * responsive sizing, and format conversion
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  style,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      quality={priority ? 85 : 75}
      className={className}
      style={style}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
    />
  )
}
