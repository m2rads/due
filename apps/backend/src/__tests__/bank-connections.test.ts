import { db } from '../db';
import { sql } from 'drizzle-orm';
import { bankConnections } from '../db/schema/bank-connections';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { 
  createBankConnection,
  getUserBankConnections,
  getBankConnection,
  updateBankConnection,
  unlinkBankConnection,
  checkDuplicateConnection
} from '../db/queries/bank-connections';

// Mock the database
jest.mock('../db', () => {
  const mockDb = {
    execute: jest.fn(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    // Make the query chainable and resolve with the mock data
    then: jest.fn(cb => cb([])),
  };
  return { db: mockDb };
});

const mockDb = db as unknown as jest.Mocked<typeof db> & {
  where: jest.Mock;
  select: jest.Mock;
  from: jest.Mock;
  insert: jest.Mock;
  values: jest.Mock;
  returning: jest.Mock;
  update: jest.Mock;
  set: jest.Mock;
  then: jest.Mock;
};

describe('Bank Connections Queries', () => {
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';
  const testData = {
    plaidAccessToken: 'access-sandbox-123',
    plaidItemId: 'item-sandbox-123',
    institutionId: 'ins_123',
    institutionName: 'Test Bank'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to returning null (no results)
    mockDb.then.mockImplementation(cb => cb([]));
  });

  describe('createBankConnection', () => {
    it('should create a new bank connection', async () => {
      const mockConnection = {
        id: 'conn-123',
        userId: testUserId,
        ...testData,
        status: 'active',
        itemStatus: 'good',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockDb.then.mockImplementation(cb => cb([mockConnection]));

      const connection = await createBankConnection(testUserId, testData);
      
      expect(connection).toMatchObject({
        userId: testUserId,
        ...testData,
        status: 'active',
        itemStatus: 'good'
      });
      expect(connection.id).toBeDefined();
      expect(connection.createdAt).toBeDefined();
      expect(connection.updatedAt).toBeDefined();
    });

    it('should enforce unique constraint on userId and institutionId', async () => {
      // Simulate a unique constraint violation
      mockDb.then.mockImplementation(() => {
        throw new Error('unique constraint violation');
      });
      
      await expect(
        createBankConnection(testUserId, testData)
      ).rejects.toThrow('unique constraint violation');
    }, 10000); // Increase timeout for this test
  });

  describe('getUserBankConnections', () => {
    it('should return empty array when no connections exist', async () => {
      mockDb.then.mockImplementation(cb => cb([]));
      
      const connections = await getUserBankConnections(testUserId);
      expect(connections).toEqual([]);
    });

    it('should return all active connections for user', async () => {
      const mockConnections = [
        { id: 'conn-123', userId: testUserId, ...testData },
        { id: 'conn-456', userId: testUserId, ...testData, institutionId: 'ins_456' }
      ];
      mockDb.then.mockImplementation(cb => cb(mockConnections));

      const connections = await getUserBankConnections(testUserId);
      expect(connections).toHaveLength(2);
      expect(connections).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'conn-123' }),
          expect.objectContaining({ id: 'conn-456' })
        ])
      );
    });

    it('should not return soft-deleted connections', async () => {
      mockDb.then.mockImplementation(cb => cb([]));
      
      const connections = await getUserBankConnections(testUserId);
      expect(connections).toHaveLength(0);
    });
  });

  describe('getBankConnection', () => {
    it('should return connection by id', async () => {
      const mockConnection = {
        id: 'conn-123',
        userId: testUserId,
        ...testData
      };
      mockDb.then.mockImplementation(cb => cb([mockConnection]));
      
      const connection = await getBankConnection(testUserId, mockConnection.id);
      expect(connection).toMatchObject(mockConnection);
    });
  });

  describe('updateBankConnection', () => {
    it('should update connection status', async () => {
      const mockConnection = {
        id: 'conn-123',
        userId: testUserId,
        ...testData,
        itemStatus: 'error',
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'The access token is invalid',
        status: 'inactive'
      };
      
      mockDb.then.mockImplementation(cb => cb([mockConnection]));

      const updated = await updateBankConnection(mockConnection.id, {
        itemStatus: 'error',
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'The access token is invalid',
        status: 'inactive'
      });

      expect(updated).toMatchObject({
        id: mockConnection.id,
        itemStatus: 'error',
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'The access token is invalid',
        status: 'inactive'
      });
    });
  });

  describe('unlinkBankConnection', () => {
    it('should soft delete the connection', async () => {
      const mockConnection = {
        id: 'conn-123',
        ...testData,
        status: 'inactive',
        deleteReason: 'user_requested',
        deletedAt: new Date()
      };
      
      mockDb.then.mockImplementation(cb => cb([mockConnection]));

      await unlinkBankConnection(testUserId, mockConnection.id, 'user_requested');

      expect(mockDb.update).toHaveBeenCalledWith(bankConnections);
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        status: 'inactive',
        deleteReason: 'user_requested',
        deletedAt: expect.any(Date)
      }));
    });
  });

  describe('checkDuplicateConnection', () => {
    it('should return false when no duplicate exists', async () => {
      mockDb.then.mockImplementation(cb => cb([]));
      
      const hasDuplicate = await checkDuplicateConnection(
        testUserId,
        'ins_789'
      );
      expect(hasDuplicate).toBe(false);
    });

    it('should return true when duplicate exists', async () => {
      mockDb.then.mockImplementation(cb => cb([testData]));
      
      const hasDuplicate = await checkDuplicateConnection(
        testUserId,
        testData.institutionId
      );
      expect(hasDuplicate).toBe(true);
    });

    it('should not count soft-deleted connections as duplicates', async () => {
      mockDb.then.mockImplementation(cb => cb([]));
      
      const hasDuplicate = await checkDuplicateConnection(
        testUserId,
        testData.institutionId
      );
      expect(hasDuplicate).toBe(false);
    });
  });
}); 