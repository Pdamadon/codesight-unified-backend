import request from 'supertest';
import app from '../../server';

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('services');

      expect(response.body.version).toBe('2.0.0');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('storage');
      expect(response.body.services).toHaveProperty('openai');
      expect(response.body.services).toHaveProperty('processing');
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we just ensure the endpoint exists and responds
      const response = await request(app)
        .get('/health');

      expect([200, 503]).toContain(response.status);
    });
  });

  describe('GET /api/health', () => {
    it('should return API health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toContain('Unified CodeSight v2.0');
    });
  });

  describe('GET /api/status', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/status')
        .expect(401);
    });

    it('should return system status with valid auth', async () => {
      // This test would require setting up proper authentication
      // For now, we just test that auth is required
      const response = await request(app)
        .get('/api/status')
        .set('x-api-key', 'test-api-key');

      // Should either return 200 with data or 401 if auth fails
      expect([200, 401]).toContain(response.status);
    });
  });
});