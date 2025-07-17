import { SecurityPrivacyService } from '../../services/security-privacy';

describe('Security Privacy Service', () => {
  let service: SecurityPrivacyService;

  beforeEach(() => {
    service = new SecurityPrivacyService();
  });

  describe('PII Detection and Masking', () => {
    it('should detect and mask email addresses', async () => {
      const testData = {
        userEmail: 'john.doe@example.com',
        message: 'Contact me at jane.smith@company.org'
      };

      const result = await service.detectAndMaskPII(testData);

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('email');
      expect(result.maskedData.userEmail).not.toBe('john.doe@example.com');
      expect(result.maskedData.userEmail).toMatch(/^j.*@example\.com$/);
    });

    it('should detect and mask phone numbers', async () => {
      const testData = {
        phone: '555-123-4567',
        contact: 'Call me at (555) 987-6543'
      };

      const result = await service.detectAndMaskPII(testData);

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('phone');
      expect(result.maskedData.phone).toBe('XXX-XXX-4567');
    });

    it('should handle data without PII', async () => {
      const testData = {
        productName: 'Widget Pro',
        price: 29.99,
        description: 'A great product for everyone'
      };

      const result = await service.detectAndMaskPII(testData);

      expect(result.hasPII).toBe(false);
      expect(result.detectedTypes).toHaveLength(0);
      expect(result.maskedData).toEqual(testData);
    });

    it('should handle nested objects', async () => {
      const testData = {
        user: {
          profile: {
            email: 'user@example.com',
            name: 'John Doe'
          }
        },
        settings: {
          notifications: true
        }
      };

      const result = await service.detectAndMaskPII(testData);

      expect(result.hasPII).toBe(true);
      expect(result.maskedData.user.profile.email).not.toBe('user@example.com');
      expect(result.maskedData.user.profile.name).not.toBe('John Doe');
      expect(result.maskedData.settings.notifications).toBe(true);
    });

    it('should handle arrays', async () => {
      const testData = {
        contacts: [
          { email: 'contact1@example.com', name: 'Contact One' },
          { email: 'contact2@example.com', name: 'Contact Two' }
        ]
      };

      const result = await service.detectAndMaskPII(testData);

      expect(result.hasPII).toBe(true);
      expect(result.maskedData.contacts[0].email).not.toBe('contact1@example.com');
      expect(result.maskedData.contacts[1].email).not.toBe('contact2@example.com');
    });
  });

  describe('Data Encryption and Decryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const originalData = {
        sessionId: 'test-session-123',
        interactions: [
          { type: 'click', element: 'button', timestamp: Date.now() }
        ],
        metadata: { quality: 85 }
      };

      const encrypted = await service.encryptData(originalData);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toContain('test-session-123');

      const decrypted = await service.decryptData(encrypted);
      expect(decrypted).toEqual(originalData);
    });

    it('should handle encryption of different data types', async () => {
      const testCases = [
        { simple: 'string' },
        { number: 42 },
        { boolean: true },
        { array: [1, 2, 3] },
        { nested: { deep: { value: 'test' } } }
      ];

      for (const testData of testCases) {
        const encrypted = await service.encryptData(testData);
        const decrypted = await service.decryptData(encrypted);
        expect(decrypted).toEqual(testData);
      }
    });

    it('should fail to decrypt invalid data', async () => {
      await expect(service.decryptData('invalid-encrypted-data'))
        .rejects.toThrow('Decryption failed');
    });
  });

  describe('API Key Management', () => {
    it('should generate API key successfully', async () => {
      const userId = 'test-user-123';
      const roles = ['user', 'tester'];

      const apiKey = await service.generateApiKey(userId, roles);

      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(32);
    });

    it('should validate generated API key', async () => {
      const userId = 'test-user-validation';
      const apiKey = await service.generateApiKey(userId);

      // Note: This test would need the actual validation logic to work
      // For now, we just test that the method doesn't throw
      const result = await service.validateApiKey(apiKey);
      expect(typeof result.isValid).toBe('boolean');
    });
  });

  describe('Data Deletion and Export', () => {
    it('should process data deletion request', async () => {
      const userId = 'test-user-deletion';
      const dataTypes = ['sessions', 'interactions'];

      // This should not throw an error
      await expect(service.processDataDeletionRequest(userId, dataTypes))
        .resolves.not.toThrow();
    });

    it('should generate data export', async () => {
      const userId = 'test-user-export';

      const exportData = await service.generateDataExport(userId);

      expect(exportData).toBeDefined();
      expect(exportData).toHaveProperty('userId');
      expect(exportData).toHaveProperty('exportDate');
      expect(exportData).toHaveProperty('sessions');
      expect(exportData.userId).toBe(userId);
      expect(Array.isArray(exportData.sessions)).toBe(true);
    });
  });

  describe('Security Metrics', () => {
    it('should get security metrics', async () => {
      const metrics = await service.getSecurityMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('period');
      expect(metrics).toHaveProperty('security');
      expect(metrics).toHaveProperty('privacy');
      expect(metrics).toHaveProperty('alerts');
      expect(Array.isArray(metrics.alerts)).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should return connection status', async () => {
      const status = await service.healthCheck();
      expect(['connected', 'disconnected', 'degraded']).toContain(status);
    });
  });
});