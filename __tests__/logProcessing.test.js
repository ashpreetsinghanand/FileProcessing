const { parseLogLine } = require('../lib/queue');

// Mock the required modules
const fs = require('fs');
jest.mock('fs', () => ({
  createReadStream: jest.fn(() => {
    // Create a mock readable stream that emits the test log file contents
    const { Readable } = require('stream');
    const mockStream = new Readable();
    mockStream._read = () => {};
    
    // Push some sample log lines
    mockStream.push('[2025-02-20T10:00:00Z] INFO Application started successfully\n');
    mockStream.push('[2025-02-20T10:01:15Z] ERROR Database timeout {"userId": 123, "ip": "192.168.1.1"}\n');
    mockStream.push(null); // Signal end of stream
    
    return mockStream;
  }),
  unlinkSync: jest.fn(),
}));

jest.mock('readline', () => ({
  createInterface: jest.fn(),
}));

jest.mock('../lib/redis', () => ({
  getRedisInstance: jest.fn(() => ({})),
}));

jest.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

describe('Log Processing Functions', () => {
  describe('parseLogLine', () => {
    it('should correctly parse a valid log line', () => {
      const line = '[2025-02-20T10:00:00Z] ERROR Database timeout {"userId": 123, "ip": "192.168.1.1"}';
      const result = parseLogLine(line);
      
      expect(result).toEqual({
        timestamp: '2025-02-20T10:00:00Z',
        level: 'ERROR',
        message: 'Database timeout',
        payload: {
          userId: 123,
          ip: '192.168.1.1',
        },
        ip: '192.168.1.1',
      });
    });
    
    it('should handle log lines without JSON payload', () => {
      const line = '[2025-02-20T10:00:00Z] INFO Application started successfully';
      const result = parseLogLine(line);
      
      expect(result).toEqual({
        timestamp: '2025-02-20T10:00:00Z',
        level: 'INFO',
        message: 'Application started successfully',
      });
    });
    
    it('should return null for invalid log lines', () => {
      const line = 'This is not a valid log line';
      const result = parseLogLine(line);
      
      expect(result).toBeNull();
    });
    
    it('should handle malformed JSON payload', () => {
      const line = '[2025-02-20T10:00:00Z] ERROR Database error {malformed json}';
      const result = parseLogLine(line);
      
      expect(result).toEqual({
        timestamp: '2025-02-20T10:00:00Z',
        level: 'ERROR',
        message: 'Database error {malformed json}',
      });
    });
  });
});