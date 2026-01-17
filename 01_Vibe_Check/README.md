# Frontend - AI Mental Coach

A modern Next.js frontend application for the AI Mental Coach chat interface. This application provides a beautiful, responsive chat UI that connects to the FastAPI backend.

## Features

- 🎨 Modern, clean UI with Tailwind CSS
- 💬 Real-time chat interface with message history
- 🌙 Dark mode support (follows system preferences)
- 📱 Fully responsive design
- ⚡ Fast and optimized with Next.js 14
- 🔄 Auto-scrolling chat messages
- ⌨️ Keyboard shortcuts (Enter to send, Shift+Enter for new line)

## Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)
- OpenAI API key (set as `OPENAI_API_KEY` environment variable for production)

## Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) For local development, create a `.env.local` file with your OpenAI API key:
   ```bash
   OPENAI_API_KEY=your-openai-api-key-here
   ```
   Note: The frontend uses Next.js API routes that call OpenAI directly - no separate backend needed!

## Running the Application

### Development Mode

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

The development server includes:
- Hot module replacement (HMR) for instant updates
- Error overlay for debugging
- Fast refresh for React components

### Production Build

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router directory
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles with Tailwind
├── components/            # React components
│   └── ChatInterface.tsx  # Main chat component
├── lib/                   # Utility functions
│   └── api.ts            # API client for backend communication
├── types/                 # TypeScript type definitions
│   └── chat.ts           # Chat-related types
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── next.config.js        # Next.js configuration
```

## How It Works

The frontend uses Next.js API routes (serverless functions) that directly call OpenAI:
- Frontend → `/api/chat` (Next.js API route) → OpenAI API
- No separate backend needed! Everything runs on Vercel serverless functions.

For local development:
- Set `OPENAI_API_KEY` in `.env.local`
- The Next.js API route will use it automatically

For production (Vercel):
- Set `OPENAI_API_KEY` in Vercel environment variables
- The API route will use it automatically

## Deployment

This frontend is configured to work with Vercel. To deploy:

1. Push your code to GitHub
2. Import your repository in Vercel
3. Configure environment variables if needed (`NEXT_PUBLIC_API_URL`)
4. Deploy!

The application will automatically build and deploy on Vercel.

## Troubleshooting

### API Connection Issues

If you see connection errors:
- Verify `OPENAI_API_KEY` is set in `.env.local` (local) or Vercel environment variables (production)
- Check browser console for specific error messages
- Verify the `/api/chat` route is deployed (check Vercel Functions tab)
- Test the route directly: `curl https://your-vercel-url.vercel.app/api/chat`

### Build Errors

If you encounter build errors:
- Clear the `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## Development Tips

- Use the browser's developer tools to inspect network requests
- Check the console for any error messages
- The chat interface auto-scrolls to show the latest messages
- Messages are stored in component state (not persisted to a database)
