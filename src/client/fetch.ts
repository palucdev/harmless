export const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<unknown> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    const data = (await response.json()) as { error?: Error };

    if (!response.ok || data?.error) {
      const message =
        data?.error?.message ?? `Request failed with status ${response.status}`;

      if (
        message.includes("JSON error injected into SSE stream") &&
        attempt < maxRetries
      ) {
        console.warn(
          `[OpenRouter] Retrying after SSE error (attempt ${attempt}/${maxRetries})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        continue;
      }

      console.log("response: ", response);
      console.log("response data: ", data);
      throw new Error(message);
    }
    return data;
  }
};
