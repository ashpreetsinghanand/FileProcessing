import { createMocks } from "node-mocks-http";
import uploadHandler from "../pages/api/upload-logs";

// Mock dependencies
jest.mock("formidable", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    parse: jest.fn(() =>
      Promise.resolve([
        {},
        {
          file: {
            filepath: "/tmp/test.log",
            originalFilename: "test.log",
            size: 1024,
          },
        },
      ])
    ),
  })),
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid"),
}));

jest.mock("../lib/queue", () => ({
  addLogProcessingJob: jest.fn(() => Promise.resolve({ id: "job-123" })),
}));

jest.mock("@supabase/auth-helpers-nextjs", () => ({
  createServerSupabaseClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: {
                id: "user-123",
              },
            },
          },
        })
      ),
    },
  })),
}));

describe("/api/upload-logs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    // Create mock request/response
    const { req, res } = createMocks({
      method: "POST",
    });

    // Mock unauthenticated session
    require("@supabase/auth-helpers-nextjs").createServerSupabaseClient.mockImplementationOnce(
      () => ({
        auth: {
          getSession: jest.fn(() =>
            Promise.resolve({
              data: { session: null },
            })
          ),
        },
      })
    );

    // Call the handler
    await uploadHandler(req, res);

    // Verify response
    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ error: "Unauthorized" });
  });

  it("should process file upload and return job details", async () => {
    // Create mock request/response
    const { req, res } = createMocks({
      method: "POST",
      // Add test file data
      files: {
        file: {
          filepath: "/tmp/test.log",
          originalFilename: "test.log",
          size: 1024,
        },
      },
    });

    // Call the handler
    await uploadHandler(req, res);

    // Verify response status and data
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      jobId: "job-123",
      fileId: "test-uuid",
      fileName: "test.log",
      message: "File uploaded and queued for processing",
    });

    // Verify queue job was called with correct params
    expect(require("../lib/queue").addLogProcessingJob).toHaveBeenCalledWith(
      "test-uuid",
      "/tmp/test.log",
      "test.log",
      1024,
      "user-123"
    );
  });

  // Test invalid request method
  it("should return 405 for non-POST requests", async () => {
    const { req, res } = createMocks({
      method: "GET",
    });

    await uploadHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: "Method not allowed" });
  });

  // Test missing file
  it("should return 400 if no file is uploaded", async () => {
    const { req, res } = createMocks({
      method: "POST",
      files: {},
    });

    await uploadHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ error: "No file uploaded" });
  });

  // Test file size limit
  it("should return 413 if file is too large", async () => {
    const { req, res } = createMocks({
      method: "POST",
      files: {
        file: {
          size: 100 * 1024 * 1024, // 100MB
        },
      },
    });

    await uploadHandler(req, res);

    expect(res._getStatusCode()).toBe(413);
    expect(JSON.parse(res._getData())).toEqual({ error: "File too large" });
  });
});
