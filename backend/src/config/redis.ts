import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false, // Fail immediately if Redis is offline
});

redis.on('connect', () => {
  console.log('Redis connected successfully.');
});

redis.on('error', (err) => {
  // Suppress continuous output spam in logs
  if (process.env.NODE_ENV === 'development') {
    // Console log only once or minimal details
  }
});

export default redis;
export { redisUrl };
