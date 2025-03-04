const {
  logProcessingQueue,
  addLogProcessingJob,
  getQueueStatus,
} = require("../lib/queue");
const { v4: uuidv4 } = require("uuid");

// Mock Redis connection
jest.mock("../lib/redis", () => ({
  getRedisInstance: jest.fn().mockReturnValue({
    host: "localhost",
    port: 6379,
  }),
}));

// Mock Supabase
jest.mock("../lib/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    update: jest.fn().mockResolvedValue({ data: {}, error: null }),
    eq: jest.fn().mockReturnThis(),
  },
  LogEntry: jest.fn(),
}));

describe("Queue Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await logProcessingQueue.close();
  });

  it("should add a job to the queue", async () => {
    const fileId = uuidv4();
    const filePath = "/tmp/test.log";
    const fileName = "test.log";
    const fileSize = 1024;
    const userId = "user-123";

    const job = await addLogProcessingJob(
      fileId,
      filePath,
      fileName,
      fileSize,
      userId
    );

    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    expect(job.data).toEqual({
      fileId,
      filePath,
      fileName,
      fileSize,
      userId,
    });
  });

  it("should get queue status", async () => {
    const status = await getQueueStatus();

    expect(status).toHaveProperty("waiting");
    expect(status).toHaveProperty("active");
    expect(status).toHaveProperty("completed");
    expect(status).toHaveProperty("failed");
    expect(status).toHaveProperty("total");
  });

  it("should process a job with valid log data", async () => {
    const fileId = uuidv4();
    const filePath = "/tmp/test.log";
    const fileName = "test.log";
    const fileSize = 1024;
    const userId = "user-123";

    // Add a job
    const job = await addLogProcessingJob(
      fileId,
      filePath,
      fileName,
      fileSize,
      userId
    );

    // Wait for job to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get updated status
    const status = await getQueueStatus();

    // Verify job was processed
    expect(status.active).toBe(0);
    expect(status.waiting).toBe(0);
  });

  it("should handle job failure gracefully", async () => {
    const fileId = uuidv4();
    const filePath = "/tmp/nonexistent.log"; // This will cause the job to fail
    const fileName = "nonexistent.log";
    const fileSize = 1024;
    const userId = "user-123";

    // Add a job
    const job = await addLogProcessingJob(
      fileId,
      filePath,
      fileName,
      fileSize,
      userId
    );

    // Wait for job to fail
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get updated status
    const status = await getQueueStatus();

    // Verify job failed
    expect(status.failed).toBeGreaterThan(0);
  });
});
