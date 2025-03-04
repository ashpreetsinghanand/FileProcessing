require("@jest/globals");

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlaHRtYXdlcGhjbWxla3VjeHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDkzMDA3MCwiZXhwIjoyMDU2NTA2MDcwfQ.9RxIByM9GevQz3LJyDbFgzmPZAs9l5FtRuhTnPEN79Q";
process.env.MAX_RETRIES = "3";
process.env.MAX_CONCURRENT_JOBS = "4";
process.env.LOG_KEYWORDS = "error,warning,critical";

// Mock console methods to reduce noise during tests
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();
