const { createReadStream } = require("fs");
const fs = require("fs");
const { Queue, Worker, Job, QueueEvents } = require("bullmq");
const { createInterface } = require("readline");
const { getRedisInstance } = require("./redis");
const { supabaseAdmin, LogEntry } = require("./supabase");
const { v4: uuidv4 } = require("uuid");
const { Server: SocketServer } = require("socket.io");
const fetch = require("node-fetch");

// Type declarations
type SocketServerType = typeof SocketServer;
type LogEntryType = typeof LogEntry;
type JobType = typeof Job;

// Define job data interface
export interface LogProcessingJobData {
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  userId: string;
}

// Create a BullMQ queue for log processing
export const logProcessingQueue = new Queue("log-processing-queue", {
  connection: getRedisInstance(),
  defaultJobOptions: {
    attempts: parseInt(process.env.MAX_RETRIES || "3"),
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

// Create queue events for real-time updates
export const queueEvents = new QueueEvents("log-processing-queue", {
  connection: getRedisInstance(),
});

// Initialize socket.io server
let io: SocketServerType | null = null;

export const setSocketServer = (socketIo: SocketServerType) => {
  io = socketIo;
};

// Parse a log line into structured data
export const parseLogLine = (line: string): LogEntryType | null => {
  try {
    // Match the log format: [TIMESTAMP] LEVEL MESSAGE {optional JSON payload}
    const regex = /\[(.*?)\]\s+(\w+)\s+(.*?)(?:\s+(\{.*\}))?$/;
    const match = line.match(regex);

    if (!match) return null;

    const [, timestamp, level, message, jsonPayload] = match;

    let payload: Record<string, any> = {};
    let ip: string | undefined;

    if (jsonPayload) {
      try {
        payload = JSON.parse(jsonPayload);
        // Extract IP if present in the payload
        ip = payload.ip || undefined;
      } catch (e) {
        // Invalid JSON payload, ignore
        console.log("Invalid JSON payload:", jsonPayload);
      }
    }

    return {
      timestamp,
      level,
      message,
      payload,
      ip,
    };
  } catch (error) {
    console.error("Error parsing log line:", error);
    return null;
  }
};

// Create a worker to process log files
export const createLogProcessingWorker = () => {
  const worker = new Worker(
    "log-processing-queue",
    async (job: JobType) => {
      const { fileId, filePath, fileName, fileSize, userId } = job.data;
      console.log(`Starting to process job ${job.id} for file ${fileName}`);
      console.log(`File details:`, { fileId, fileSize, userId });

      // Create initial stats record
      const statsId = uuidv4();
      console.log(`Creating initial stats record with ID: ${statsId}`);

      await supabaseAdmin.from("log_stats").insert({
        id: statsId,
        job_id: job.id || "",
        file_id: fileId,
        file_name: fileName,
        file_size: fileSize,
        user_id: userId,
        status: "processing",
        total_lines: 0,
        error_count: 0,
        warning_count: 0,
        keyword_matches: {},
        ip_addresses: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processing_time: 0,
      });

      const startTime = Date.now();

      try {
        // Get keywords to track from environment
        const keywords = (process.env.LOG_KEYWORDS || "error,warning,critical")
          .toLowerCase()
          .split(",")
          .map((k) => k.trim());
        console.log(`Tracking keywords:`, keywords);

        // Initialize counters
        let totalLines = 0;
        let errorCount = 0;
        let warningCount = 0;
        const keywordMatches: Record<string, number> = {};
        const ipAddresses: Record<string, number> = {};

        // Initialize keywords counter
        keywords.forEach((keyword) => {
          keywordMatches[keyword] = 0;
        });


        // Create readable stream for the log file
        const fileStream = createReadStream(filePath, { encoding: "utf8" });
        const rl = createInterface({
          input: fileStream,
          crlfDelay: Infinity,
        });
        // Process the file line by line
        for await (const line of rl) {
          totalLines++;

          // Update progress every 1000 lines
          if (totalLines % 1000 === 0) {
            const progress = Math.min(
              99,
              Math.floor((totalLines / (fileSize / 100)) * 100)
            );
            console.log(
              `Processing progress: ${progress}% (${totalLines} lines)`
            );

            await job.updateProgress(progress);

            // Emit progress update via Socket.IO
            if (io) {
              io.to(userId).emit("job-progress", {
                jobId: job.id,
                progress,
                stats: {
                  totalLines,
                  errorCount,
                  warningCount,
                  keywordMatches,
                  ipAddresses,
                },
              });
            }
          }

          const logEntry = parseLogLine(line);
          if (!logEntry) {
            console.log(`Log entry is null or undefined`);
            continue;
          }

          // Count errors and warnings
          if (logEntry.level) {
            // console.log(`Log entry level: ${logEntry.level}`);
            const levelLower = logEntry.level.toLowerCase();
            console.log(`Log entry level lower: ${levelLower}`);
           if (levelLower.includes("error")) {
             errorCount++;
           } else if (levelLower.includes("warning")) {
             warningCount++;
           }
          }

          // Count keyword matches safely
          if (logEntry.message) {
            const lowerMessage = logEntry.level.toLowerCase();
            // console.log(`Log entry message: ${lowerMessage}---------------------------`);
            
            keywords.forEach((keyword) => {
              // console.log(`Checking message: ${lowerMessage} for keyword: ${keyword}`);
              if (lowerMessage.includes(keyword)) {
                keywordMatches[keyword] = (keywordMatches[keyword] || 0) + 1;
                // console.log(`Keyword matched: ${keyword}, Count: ${keywordMatches[keyword]}`);
              }
            });
          }

          // Count IP addresses
          if (logEntry.ip) {
            ipAddresses[logEntry.ip] = (ipAddresses[logEntry.ip] || 0) + 1;
          }
        }

        const processingTime = Date.now() - startTime;
        console.log(`Processing completed in ${processingTime}ms`);
        console.log(`Final stats:`, {
          totalLines,
          errorCount,
          warningCount,
          keywordMatches,
          ipAddresses,
        });

        // Update the stats in Supabase
        const updateData = {
          total_lines: totalLines,
          error_count: errorCount,
          warning_count: warningCount,
          keyword_matches: keywordMatches,
          ip_addresses: ipAddresses,
          status: "completed",
          updated_at: new Date().toISOString(),
          processing_time: processingTime,
        };
        await supabaseAdmin
          .from("log_stats")
          .update(updateData)
          .eq("id", statsId);

        // Clean up the temporary file
        fs.unlinkSync(filePath);

        // Emit completion event via Socket.IO
        if (io) {
          io.to(userId).emit("job-completed", {
            jobId: job.id,
            fileId,
            fileName,
            stats: {
              totalLines,
              errorCount,
              warningCount,
              keywordMatches,
              ipAddresses,
              processingTime,
            },
          });
        }

        return {
          statsId,
          totalLines,
          errorCount,
          warningCount,
          keywordMatches,
          ipAddresses,
          processingTime,
        };
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);

        // Update the stats record with failure status
        await supabaseAdmin
          .from("log_stats")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", statsId);

        // Emit error event via Socket.IO
        if (io) {
          io.to(userId).emit("job-failed", {
            jobId: job.id,
            fileId,
            fileName,
            error: (error as Error).message,
          });
        }

        throw error;
      }
    },
    {
      connection: getRedisInstance(),
      concurrency: parseInt(process.env.MAX_CONCURRENT_JOBS || "4"),
    }
  );

  worker.on("completed", async(job: JobType, result: any) => {
    console.log(`Job ${job.id} completed successfully with result:`, result);
   
  });

  worker.on("failed", (job: JobType | undefined, error: Error) => {
    console.error(`Job ${job?.id} failed with error:`, error);
  });

  worker.on("error", (error: Error) => {
    console.error(`Worker error:`, error);
  });

  return worker;
};

// Add a job to the queue
export const addLogProcessingJob = async (
  fileId: string,
  filePath : string,
  fileName: string,
  fileSize: number,
  userId: string
) => {
  console.log(`Adding job to queue for file: ${fileName} (${fileSize} bytes)`);

  const job = await logProcessingQueue.add(
    "process-log-file",
    {
      fileId,
      filePath,
      fileName,
      fileSize,
      userId,
    },
    {
      jobId: fileId,
      attempts: parseInt(process.env.MAX_RETRIES || "3"),
      removeOnComplete: true,
      removeOnFail: 100,
      priority:
        fileSize < 1024 * 1024 ? 1 : fileSize < 10 * 1024 * 1024 ? 2 : 3,
    }
  );

  console.log(`Job added to queue with ID: ${job.id}`);
  return job;
};

// Get the current status of the queue
export const getQueueStatus = async () => {
  const [waiting, active, completed, failed] = await Promise.all([
    logProcessingQueue.getWaitingCount(),
    logProcessingQueue.getActiveCount(),
    logProcessingQueue.getCompletedCount(),
    logProcessingQueue.getFailedCount(),
  ]);

  // Log queue status
  console.log("Queue Status:", {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  });

  // Get waiting jobs details
  const waitingJobs = await logProcessingQueue.getWaiting();
  console.log(
    "Waiting Jobs:",
    waitingJobs.map((job: JobType) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      timestamp: job.timestamp,
    }))
  );

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
};

createLogProcessingWorker()