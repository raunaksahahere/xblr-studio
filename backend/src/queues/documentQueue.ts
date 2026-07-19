import { Queue } from 'bullmq';
import redisClient from '../config/redis';
import { addDocumentJobMemory } from './memoryQueue';

let queue: Queue | null = null;
let isRedisAvailable = false; // False by default, wait for explicit connection event

try {
  queue = new Queue('document-processing', {
    connection: redisClient as any,
  });
} catch (err) {
  console.warn('[DocumentQueue] Failed to instantiate BullMQ queue.');
}

// Set up event listeners to toggle availability
redisClient.on('connect', () => {
  isRedisAvailable = true;
  console.log('[DocumentQueue] Redis connected. Enabling BullMQ.');
});

redisClient.on('error', () => {
  isRedisAvailable = false;
});

redisClient.on('close', () => {
  isRedisAvailable = false;
});

export const addDocumentJob = async (documentId: string, filePath: string) => {
  if (isRedisAvailable && queue) {
    try {
      await queue.add('process-document', {
        documentId,
        filePath,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
      console.log(`[DocumentQueue] Queued job using BullMQ for doc: ${documentId}`);
      return;
    } catch (err) {
      console.error('[DocumentQueue] Failed to add to BullMQ. Falling back to memory queue.');
    }
  }

  // Standalone memory-queue fallback
  await addDocumentJobMemory(documentId, filePath);
};

export { queue };
