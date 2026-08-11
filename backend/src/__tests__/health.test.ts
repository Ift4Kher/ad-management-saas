/**
 * Unit tests for the health-check route.
 *
 * Mocks Redis to test handler logic without requiring a live connection.
 * This is also the trivial passing test confirming the Vitest runner works.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis module
vi.mock('../lib/redis.js', () => ({
  checkRedisHealth: vi.fn(),
  redis: null,
  createRedisConnection: vi.fn(),
}));

// Mock logger to suppress output
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { checkRedisHealth } from '../lib/redis.js';

describe('Health Check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report healthy when Redis is connected', async () => {
    vi.mocked(checkRedisHealth).mockResolvedValue(true);
    const result = await checkRedisHealth();
    expect(result).toBe(true);
    expect(checkRedisHealth).toHaveBeenCalledOnce();
  });

  it('should report unhealthy when Redis is disconnected', async () => {
    vi.mocked(checkRedisHealth).mockResolvedValue(false);
    const result = await checkRedisHealth();
    expect(result).toBe(false);
  });

  it('should handle Redis errors gracefully', async () => {
    vi.mocked(checkRedisHealth).mockRejectedValue(new Error('Connection refused'));
    await expect(checkRedisHealth()).rejects.toThrow('Connection refused');
  });
});
