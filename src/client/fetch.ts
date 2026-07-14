export const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<unknown> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let data: any;
      
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch (parseErr) {
        throw new Error(`Failed to parse JSON response (status ${response.status}). Body: ${text.slice(0, 500)}...`);
      }

      if (!response.ok || data?.error) {
        let message = data?.error?.message ?? (typeof data?.error === 'string' ? data.error : `Request failed with status ${response.status}`);
        
        if (data?.error?.metadata?.provider_name) {
          message = `${message} (${data.error.metadata.provider_name})`;
        }
        if (data?.error?.metadata?.raw) {
          message = `${message}: ${data.error.metadata.raw}`;
        }

        if (message.includes('JSON error injected into SSE stream') && attempt < maxRetries) {
          console.warn(`[OpenRouter] Retrying after SSE error (attempt ${attempt}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
          continue;
        }

        throw new Error(message);
      }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        console.warn(`[OpenRouter] Connection error (attempt ${attempt}/${maxRetries}): ${message}. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      } else {
        throw err;
      }
    }
  }
};

