'use client';

import { useState, useCallback } from 'react';
import ChatInterface from '../components/ChatInterface';
import GoogleAuthButton from '../components/GoogleAuthButton';
import CalendarPanel from '../components/CalendarPanel';

export default function Home() {
  // State to trigger calendar refresh when AI creates an event
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);

  // Callback to refresh calendar panel
  const handleCalendarUpdate = useCallback(() => {
    setCalendarRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-6xl">
        {/* Header with auth button */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                AI Mental Coach
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your supportive companion for stress, motivation, habits, and confidence
              </p>
            </div>
            <GoogleAuthButton />
          </div>
        </div>

        {/* Main content - Chat and Calendar side by side on larger screens */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chat interface - takes more space */}
          <div className="flex-1 lg:flex-[2]">
            <ChatInterface onCalendarUpdate={handleCalendarUpdate} />
          </div>

          {/* Calendar panel - sidebar on larger screens */}
          <div className="lg:flex-1 lg:max-w-sm">
            <CalendarPanel refreshTrigger={calendarRefreshTrigger} />
          </div>
        </div>
      </div>
    </main>
  );
}
