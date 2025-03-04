# Real-Time Log Processing Microservice

A full-stack application featuring a Node.js microservice that processes large log files asynchronously using BullMQ, a Next.js frontend with React for real-time analytics, and Supabase for authentication and database storage.

## Features

- **Asynchronous Log Processing**: Upload and process large log files without blocking the main thread
- **Real-Time Updates**: Get live updates on processing progress via WebSockets
- **Authentication**: Secure access with Supabase Auth (email/password and GitHub OAuth)
- **Scalable Queue System**: Process multiple files concurrently with BullMQ
- **Analytics Dashboard**: View statistics on errors, warnings, keywords, and IP addresses
- **Docker Deployment**: Easy deployment with Docker and docker-compose

## Tech Stack

- **Frontend**: Next.js 14.x, React 18.x, Tailwind CSS
- **Backend**: Node.js 20.x, BullMQ, Socket.IO
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Queue**: BullMQ with Redis
- **Deployment**: Docker, docker-compose

## Prerequisites

- Node.js 20.x
- Docker and docker-compose
- Supabase account

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
npm i
```

### 2. Set up Supabase

1. Create a new Supabase project
2. Run the SQL migration in `supabase/migrations/create_log_stats_table.sql`
3. Copy your Supabase URL and keys

### 3. Configure environment variables

Create a `.env.local` file with the following variables:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Log Processing Configuration
LOG_KEYWORDS=error,warning,critical,exception,failed
MAX_CONCURRENT_JOBS=4
MAX_RETRIES=3
```

### 4. Local Development

```bash
# Install dependencies
npm install

# Start Redis (required for BullMQ)
docker run -d -p 6379:6379 redis:alpine

# Run the development server
npm run dev
```

### 5. Docker Deployment

```bash
# Build and start the containers
docker-compose up -d
```

## Usage

1. Navigate to `http://localhost:3000`
2. Sign up or log in
3. Upload a log file using the file uploader
4. View real-time processing updates and statistics

## Project Structure

```
├── components/           # React components
├── lib/                  # Shared utilities and libraries
│   ├── queue.ts          # BullMQ queue and worker setup
│   ├── redis.ts          # Redis connection
│   └── supabase.ts       # Supabase client and types
├── pages/                # Next.js pages
│   ├── api/              # API routes
│   │   ├── upload-logs.ts    # File upload endpoint
│   │   ├── stats.ts          # Stats retrieval
│   │   ├── stats/[jobId].ts  # Job-specific stats
│   │   ├── queue-status.ts   # Queue status endpoint
│   │   └── socket.ts         # WebSocket endpoint
│   ├── _app.tsx          # App component
│   ├── index.tsx         # Dashboard page
│   └── auth.tsx          # Authentication page
├── public/               # Static assets
├── styles/               # CSS styles
├── supabase/             # Supabase migrations
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # Project documentation
```

## Future Improvements

- Implement Node.js clustering for better performance with very large files
- Add more sophisticated log parsing options
- Implement more advanced analytics and visualization
- Add export functionality for processed data
- Implement more comprehensive error handling and retry mechanisms
