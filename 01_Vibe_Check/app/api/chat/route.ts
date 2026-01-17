import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';
import { authOptions } from '../../../lib/auth';
import { listUpcomingEvents, formatEventsForAI, createEvent } from '../../../lib/google-calendar';

// Ensure this route is always treated as a serverless function
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Increased for calendar operations

interface ChatRequest {
  message: string;
}

interface CalendarAction {
  action: 'create_event';
  summary: string;
  description?: string;
  date: string;
  time: string;
  duration?: number; // in minutes, default 60
}

/**
 * Parses AI response for calendar action JSON blocks
 */
function parseCalendarAction(response: string): CalendarAction | null {
  // Look for JSON block in the response
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.action === 'create_event' && parsed.summary && parsed.date && parsed.time) {
        return parsed as CalendarAction;
      }
    } catch {
      // JSON parsing failed, no action to take
    }
  }
  return null;
}

/**
 * Builds the system prompt with calendar context
 */
function buildSystemPrompt(calendarContext: string | null, hasCalendarAccess: boolean): string {
  let prompt = `You are a supportive mental coach. You help users with stress management, motivation, building better habits, and boosting confidence. Be empathetic, encouraging, and practical in your advice.`;

  if (hasCalendarAccess) {
    prompt += `\n\nYou have access to the user's Google Calendar. ${calendarContext || 'No upcoming events scheduled.'}`;
    
    prompt += `\n\nWhen the user wants to schedule something (like a meditation session, workout, journaling time, or any wellness activity), you can help them create a calendar event. To do this, include a JSON block in your response like this:

\`\`\`json
{"action": "create_event", "summary": "Event Title", "description": "Optional description", "date": "YYYY-MM-DD", "time": "HH:MM", "duration": 60}
\`\`\`

The duration is in minutes (default 60 if not specified). Only include this JSON block when the user explicitly asks to schedule or add something to their calendar.`;
  } else {
    prompt += `\n\nNote: The user hasn't connected their Google Calendar yet. If they ask about scheduling or their calendar, suggest they connect it using the "Connect Google Calendar" button.`;
  }

  return prompt;
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Chat API is working. Use POST to send messages.',
    version: 'Phase 5 - Calendar Integration'
  });
}

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/chat called - With Calendar Integration');
  
  try {
    const body: ChatRequest = await request.json();
    
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured.' },
        { status: 500 }
      );
    }

    // Get user session for calendar access
    const session = await getServerSession(authOptions);
    const hasCalendarAccess = !!session?.accessToken;
    let calendarContext: string | null = null;

    // Fetch calendar events if user is authenticated
    if (hasCalendarAccess && session.accessToken) {
      try {
        console.log('[API] Fetching calendar events for context...');
        const events = await listUpcomingEvents(session.accessToken, 10);
        calendarContext = formatEventsForAI(events);
        console.log('[API] Calendar context:', calendarContext);
      } catch (calendarError) {
        console.error('[API] Failed to fetch calendar events:', calendarError);
        // Continue without calendar context
      }
    }

    // Build system prompt with calendar context
    const systemPrompt = buildSystemPrompt(calendarContext, hasCalendarAccess);

    console.log('[API] Calling OpenAI API...');
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.message },
      ],
      temperature: 0.7,
    });

    let reply = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    console.log('[API] OpenAI response received');

    // Check for calendar action in response
    let calendarActionResult = null;
    if (hasCalendarAccess && session?.accessToken) {
      const calendarAction = parseCalendarAction(reply);
      
      if (calendarAction) {
        console.log('[API] Calendar action detected:', calendarAction);
        
        try {
          // Parse date and time
          const [year, month, day] = calendarAction.date.split('-').map(Number);
          const [hours, minutes] = calendarAction.time.split(':').map(Number);
          
          const startTime = new Date(year, month - 1, day, hours, minutes);
          const duration = calendarAction.duration || 60;
          const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

          // Create the event
          const event = await createEvent(session.accessToken, {
            summary: calendarAction.summary,
            description: calendarAction.description,
            startTime,
            endTime,
          });

          calendarActionResult = {
            success: true,
            event: {
              id: event.id,
              summary: event.summary,
              start: event.start,
              htmlLink: event.htmlLink,
            },
          };

          console.log('[API] Calendar event created:', event.id);
          
          // Remove the JSON block from the reply for cleaner display
          reply = reply.replace(/```json\n[\s\S]*?\n```/g, '').trim();
          reply += `\n\n✅ I've added "${calendarAction.summary}" to your calendar!`;
          
        } catch (createError) {
          console.error('[API] Failed to create calendar event:', createError);
          reply = reply.replace(/```json\n[\s\S]*?\n```/g, '').trim();
          reply += `\n\n⚠️ I tried to add this to your calendar but encountered an error. Please try again or add it manually.`;
        }
      }
    }

    return NextResponse.json({ 
      reply,
      calendarAction: calendarActionResult,
      hasCalendarAccess,
    });
    
  } catch (error) {
    console.error('Error in chat API:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Error: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}
