import { ChatRequest } from '../types/chat';

/**
 * Extended chat response with calendar integration
 */
export interface ChatApiResponse {
  reply: string;
  calendarAction?: {
    success: boolean;
    event?: {
      id: string;
      summary: string;
      start: string;
      htmlLink?: string;
    };
  };
  hasCalendarAccess?: boolean;
}

/**
 * Sends a chat message to the backend API via Next.js API route
 * Returns the full response including calendar action results
 * @param message - The user's message to send
 * @returns Promise resolving to the full API response
 * @throws Error if the API request fails
 */
export async function sendChatMessage(message: string): Promise<ChatApiResponse> {
  const requestBody: ChatRequest = { message };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for calendar ops
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.detail || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data: ChatApiResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        console.error('Fetch error details:', error);
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
    throw new Error('Failed to send message. Please try again.');
  }
}

