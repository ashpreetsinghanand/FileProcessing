import { createMocks } from 'node-mocks-http';
import uploadHandler from '../pages/api/upload-logs';

// Mock dependencies
jest.mock('formidable', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    parse: jest.fn(() => Promise.resolve([{}, { file: { filepath: '/tmp/test.log', originalFilename: 'test.log', size: 1024 } }])),
  })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

jest.mock('../lib/queue', () => ({
  addLogProcessingJob: jest.fn(() => Promise.resolve({ id: 'job-123' })),
}));

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: {
          session: {
            user: {
              id: 'user-123',
            },
          },
        },
      })),
    },
  })),
}));

describe('/api/upload-logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    // Mock unauthenticated session
    require('@supabase/auth-helpers-nextjs').createServerSupabaseClient.mockImplementationOnce(() => ({
      auth: {
        getSession: jest.fn(() => Promise.resolve({
          data: { session: null },
        })),
      },
    }));

    await uploadHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' });
  });

  it('should process file upload and return job details', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await uploadHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      success: true,
      jobId: 'job-123',
      fileId: 'test-uuid',
      fileName: 'test.log',
      message: 'File uploaded and queued for processing',
    });
    
    expect(require('../lib/queue').addLogProcessingJob).toHaveBeenCalledWith(
      'test-uuid',
      '/tmp/test.log',
      'test.log',
      1024,
      'user-123'
    );
  });
});