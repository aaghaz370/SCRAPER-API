import axios, { AxiosError } from 'axios';

function getScraperApiKeys(): string[] {
  const keys = process.env.SCRAPER_API_KEYS;
  if (!keys) {
    throw new Error('SCRAPER_API_KEYS environment variable is not set');
  }
  return keys.split(',').map(key => key.trim());
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function fetchWithScraperApi(url: string): Promise<string> {
  const allKeys = getScraperApiKeys();
  const shuffledKeys = shuffleArray(allKeys);
  
  let lastError: Error | null = null;
  
  // Try each key until one works
  for (let i = 0; i < shuffledKeys.length; i++) {
    const apiKey = shuffledKeys[i];
    const scraperApiUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
    
    try {
      const response = await axios.get(scraperApiUrl, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
        }
      });
      
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // If it's a 403 (quota exceeded) or 429 (rate limit), try the next key
      if (axiosError.response?.status === 403 || axiosError.response?.status === 429) {
        console.warn(`ScraperAPI key ${i + 1}/${shuffledKeys.length} failed with ${axiosError.response.status}. Trying next key...`);
        lastError = new Error(axiosError.response?.data as string || 'Quota exceeded');
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  // If all keys failed, throw the last error
  throw new Error(`All ScraperAPI keys exhausted. Last error: ${lastError?.message || 'Unknown error'}`);
}
