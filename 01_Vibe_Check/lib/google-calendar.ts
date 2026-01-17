import { google, calendar_v3 } from 'googleapis';

/**
 * Creates an authenticated Google Calendar client
 * @param accessToken - OAuth access token from user session
 */
export function getCalendarClient(accessToken: string): calendar_v3.Calendar {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Represents a simplified calendar event for the frontend
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  htmlLink?: string;
}

/**
 * Fetches upcoming events from the user's primary calendar
 * @param accessToken - OAuth access token
 * @param maxResults - Maximum number of events to return (default: 10)
 * @param timeMin - Start time for events (default: now)
 * @returns Array of calendar events
 */
export async function listUpcomingEvents(
  accessToken: string,
  maxResults = 10,
  timeMin?: Date
): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient(accessToken);
  
  const now = timeMin || new Date();
  console.log('[Calendar] Current server time:', now.toISOString());
  console.log('[Calendar] Filtering events from:', now.toISOString());
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  const events = response.data.items || [];
  
  // Filter out past events (handles edge cases with all-day events)
  const nowTimestamp = now.getTime();
  const filteredEvents = events.filter((event) => {
    const startStr = event.start?.dateTime || event.start?.date;
    if (!startStr) return false;
    
    // For all-day events (date only), treat as start of that day
    const eventStart = new Date(startStr);
    
    // For all-day events, add a day to account for the full day
    if (!event.start?.dateTime && event.start?.date) {
      // All-day event: include if the event date is today or future
      const eventDate = new Date(startStr + 'T23:59:59');
      return eventDate.getTime() >= nowTimestamp;
    }
    
    return eventStart.getTime() >= nowTimestamp;
  });
  
  console.log(`[Calendar] Filtered ${events.length} events to ${filteredEvents.length} (removed past events)`);
  
  return filteredEvents.map((event) => ({
    id: event.id || '',
    summary: event.summary || 'Untitled Event',
    description: event.description || undefined,
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    location: event.location || undefined,
    htmlLink: event.htmlLink || undefined,
  }));
}

/**
 * Parameters for creating a new calendar event
 */
export interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
}

/**
 * Creates a new event on the user's primary calendar
 * @param accessToken - OAuth access token
 * @param params - Event parameters
 * @returns Created event details
 */
export async function createEvent(
  accessToken: string,
  params: CreateEventParams
): Promise<CalendarEvent> {
  const calendar = getCalendarClient(accessToken);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const event: calendar_v3.Schema$Event = {
    summary: params.summary,
    description: params.description,
    location: params.location,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone,
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone,
    },
    reminders: params.reminders || {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 },
      ],
    },
  };
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });
  
  const created = response.data;
  
  return {
    id: created.id || '',
    summary: created.summary || params.summary,
    description: created.description || undefined,
    start: created.start?.dateTime || created.start?.date || '',
    end: created.end?.dateTime || created.end?.date || '',
    location: created.location || undefined,
    htmlLink: created.htmlLink || undefined,
  };
}

/**
 * Deletes an event from the user's primary calendar
 * @param accessToken - OAuth access token
 * @param eventId - ID of the event to delete
 */
export async function deleteEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const calendar = getCalendarClient(accessToken);
  
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });
}

/**
 * Formats calendar events into a human-readable string for AI context
 * @param events - Array of calendar events
 * @returns Formatted string describing upcoming events
 */
export function formatEventsForAI(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return 'No upcoming events scheduled.';
  }
  
  const eventStrings = events.map((event) => {
    const startDate = new Date(event.start);
    const formattedDate = startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    
    let eventStr = `- ${event.summary} on ${formattedDate} at ${formattedTime}`;
    if (event.location) {
      eventStr += ` (${event.location})`;
    }
    return eventStr;
  });
  
  return `Upcoming events:\n${eventStrings.join('\n')}`;
}
