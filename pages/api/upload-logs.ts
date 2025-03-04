import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import formidable from "formidable";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { addLogProcessingJob } from "@/lib/queue";
import fs from "fs";
import path from "path";
// Disable the default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const router = createRouter<NextApiRequest, NextApiResponse>();

// Rate limiting middleware
let requestCounts: Record<string, { count: number; resetTime: number }> = {};
const MAX_REQUESTS = 10; // Max requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute

router.use(async (req, res, next) => {
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the session from the cookie
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Apply rate limiting
  const userId = user.id;
  const now = Date.now();

  // Initialize or reset counter if needed
  if (!requestCounts[userId] || requestCounts[userId].resetTime < now) {
    requestCounts[userId] = { count: 0, resetTime: now + WINDOW_MS };
  }

  // Increment counter
  requestCounts[userId].count++;

  // Check if limit exceeded
  if (requestCounts[userId].count > MAX_REQUESTS) {
    return res
      .status(429)
      .json({ error: "Too many requests, please try again later" });
  }

  // Add user ID to request for later use
  (req as any).userId = userId;

  await next();
});

router.post(async (req, res) => {
  const userId = (req as any).userId;

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB max file size
      uploadDir: uploadsDir,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate a unique ID for the file
    const fileId = uuidv4();

    // Get file details
    const filePath = file.filepath;
    const fileName = file.originalFilename || "unknown-file";
    const fileSize = file.size;

    // Add job to the processing queue
    const job = await addLogProcessingJob(
      fileId,
      filePath,
      fileName,
      fileSize,
      userId
    );

    return res.status(200).json({
      success: true,
      jobId: job.id,
      fileId,
      fileName,
      message: "File uploaded and queued for processing",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ error: "Failed to upload and process file" });
  }
});

export default router.handler();
