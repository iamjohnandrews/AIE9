import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { 
  listUpcomingEvents, 
  createEvent, 
  CalendarEvent,
  CreateEventParams 
} from '../../../../lib/google-calendar';

/**
 * GET /api/calendar/events
 * Fetches upcoming events from user's Google Calendar
 * 
 * Query params:
 * - maxResults: number (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please sign in with Google.' },
        { status: 401 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults') || '10', 10);
    
    console.log('[Calendar API] Fetching events, maxResults:', maxResults);
    
    const events = await listUpcomingEvents(
      session.accessToken,
      maxResults
    );
    
    console.log('[Calendar API] Found', events.length, 'events');
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('[Calendar API] Error fetching events:', error);
    
    if (error instanceof Error) {
      // Check for token expiry or auth errors
      if (error.message.includes('invalid_grant') || 
          error.message.includes('Token has been expired')) {
        return NextResponse.json(
          { error: 'Session expired. Please sign in again.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch events: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events
 * Creates a new event on user's Google Calendar
 * 
 * Body:
 * - summary: string (required)
 * - description: string (optional)
 * - startTime: ISO date string (required)
 * - endTime: ISO date string (required)
 * - location: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please sign in with Google.' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.summary || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: summary, startTime, endTime' },
        { status: 400 }
      );
    }
    
    const params: CreateEventParams = {
      summary: body.summary,
      description: body.description,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      location: body.location,
    };
    
    console.log('[Calendar API] Creating event:', params.summary);
    
    const event = await createEvent(session.accessToken, params);
    
    console.log('[Calendar API] Event created:', event.id);
    
    return NextResponse.json({ 
      event,
      message: `Event "${event.summary}" created successfully!`
    });
  } catch (error) {
    console.error('[Calendar API] Error creating event:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant') || 
          error.message.includes('Token has been expired')) {
        return NextResponse.json(
          { error: 'Session expired. Please sign in again.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to create event: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
