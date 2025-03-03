import { Redis } from 'ioredis';

// Create Redis connection for BullMQ
const createRedisInstance = () => {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    maxRetriesPerRequest: null,
  });

  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  return redis;
};

// Export a singleton Redis instance
let redisInstance: Redis | null = null;

export function getRedisInstance(): Redis {
  if (!redisInstance) {
    redisInstance = createRedisInstance();
  }
  return redisInstance;
}