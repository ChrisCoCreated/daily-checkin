/**
 * Get base URL using WHATWG URL API
 * Prefers NEXT_PUBLIC_BASE_URL, falls back to VERCEL_URL, then localhost
 */
export function getBaseUrl(): string {
  let baseUrl: string;
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_BASE_URL.trim();
    try {
      // Use WHATWG URL API to properly construct and validate URL
      const urlObj = new URL(url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`);
      baseUrl = urlObj.origin;
    } catch {
      // Fallback if URL parsing fails
      baseUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;
    }
  } else if (process.env.VERCEL_URL) {
    try {
      const urlObj = new URL(`https://${process.env.VERCEL_URL}`);
      baseUrl = urlObj.origin;
    } catch {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    }
  } else {
    baseUrl = 'http://localhost:3000';
  }
  
  return baseUrl;
}

/**
 * Build a URL with path and optional query parameters using WHATWG URL API
 */
export function buildUrl(path: string, searchParams?: Record<string, string>): string {
  const baseUrl = getBaseUrl();
  const url = new URL(path, baseUrl);
  
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}


