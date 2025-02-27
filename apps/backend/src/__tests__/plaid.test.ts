import { Request, Response } from 'express';
import { plaidClient } from '../config/plaid';
import { 
  createLinkToken,
  exchangePublicToken,
  getRecurringTransactions,
  getBankConnections,
  unlinkBankConnection
} from '../controllers/plaid';
import {
  createBankConnection,
  getUserBankConnections,
  unlinkBankConnection as unlinkBank,
  checkDuplicateConnection
} from '../db/queries/bank-connections';

// Mock the Plaid client
jest.mock('../config/plaid', () => ({
  plaidClient: {
    linkTokenCreate: jest.fn(),
    itemPublicTokenExchange: jest.fn(),
    accountsGet: jest.fn(),
    transactionsRecurringGet: jest.fn()
  }
}));

// Mock the database queries
jest.mock('../db/queries/bank-connections', () => ({
  createBankConnection: jest.fn(),
  getUserBankConnections: jest.fn(),
  unlinkBankConnection: jest.fn(),
  checkDuplicateConnection: jest.fn()
}));

describe('Plaid Controllers', () => {
  const mockReq = {
    sessionID: 'test-session-id',
    session: {},
    body: {},
    params: {},
    setTimeout: jest.fn(),
    destroy: jest.fn(),
    _read: jest.fn(),
    read: jest.fn()
  } as unknown as Request;

  const mockRes = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis()
  } as unknown as Response;

  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLinkToken', () => {
    it('should create link token for localhost', async () => {
      const mockTokenResponse = {
        data: { link_token: 'link-sandbox-123' }
      };
      (plaidClient.linkTokenCreate as jest.Mock).mockResolvedValue(mockTokenResponse);

      const req = { 
        ...mockReq, 
        body: { address: 'localhost' }
      } as Request;

      await createLinkToken(req, mockRes, mockNext);

      expect(plaidClient.linkTokenCreate).toHaveBeenCalledWith(expect.objectContaining({
        client_name: 'Plaid Tiny Quickstart - React Native',
        user: { client_user_id: 'test-session-id' }
      }));
      expect(mockRes.json).toHaveBeenCalledWith(mockTokenResponse.data);
    });

    it('should create link token for mobile', async () => {
      const mockTokenResponse = {
        data: { link_token: 'link-sandbox-123' }
      };
      (plaidClient.linkTokenCreate as jest.Mock).mockResolvedValue(mockTokenResponse);

      const req = { 
        ...mockReq, 
        body: { address: '10.0.2.2' }
      } as Request;

      await createLinkToken(req, mockRes, mockNext);

      expect(plaidClient.linkTokenCreate).toHaveBeenCalledWith(expect.objectContaining({
        client_name: 'Due',
        user: { client_user_id: 'test-session-id' }
      }));
      expect(mockRes.json).toHaveBeenCalledWith(mockTokenResponse.data);
    });
  });

  describe('exchangePublicToken', () => {
    const mockExchangeData = {
      public_token: 'public-sandbox-123',
      institutionId: 'ins_123',
      institutionName: 'Test Bank'
    };

    it('should exchange token and create bank connection', async () => {
      const mockExchangeResponse = {
        data: {
          access_token: 'access-sandbox-123',
          item_id: 'item-sandbox-123'
        }
      };
      
      (plaidClient.itemPublicTokenExchange as jest.Mock).mockResolvedValue(mockExchangeResponse);
      (createBankConnection as jest.Mock).mockResolvedValue({
        id: 'conn-123',
        ...mockExchangeData
      });

      const req = { 
        ...mockReq, 
        body: mockExchangeData
      } as Request;

      await exchangePublicToken(req, mockRes, mockNext);

      expect(plaidClient.itemPublicTokenExchange).toHaveBeenCalledWith({
        public_token: mockExchangeData.public_token
      });
      expect(createBankConnection).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          plaidAccessToken: mockExchangeResponse.data.access_token,
          plaidItemId: mockExchangeResponse.data.item_id
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle duplicate connections', async () => {
      (checkDuplicateConnection as jest.Mock).mockResolvedValue(true);

      const req = { 
        ...mockReq, 
        body: mockExchangeData
      } as Request;

      await exchangePublicToken(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          error: 'DUPLICATE_CONNECTION'
        })
      );
    });
  });

  describe('getRecurringTransactions', () => {
    const mockConnections = [{
      id: 'conn-123',
      plaidAccessToken: 'access-sandbox-123',
      status: 'active'
    }];

    it('should fetch transactions from all active connections', async () => {
      (getUserBankConnections as jest.Mock).mockResolvedValue(mockConnections);
      
      const mockAccounts = {
        data: {
          accounts: [{ account_id: 'acc-123' }]
        }
      };
      (plaidClient.accountsGet as jest.Mock).mockResolvedValue(mockAccounts);

      const mockTransactions = {
        data: {
          inflow_streams: [],
          outflow_streams: []
        }
      };
      (plaidClient.transactionsRecurringGet as jest.Mock).mockResolvedValue(mockTransactions);

      await getRecurringTransactions(mockReq, mockRes, mockNext);

      expect(plaidClient.accountsGet).toHaveBeenCalledWith({
        access_token: mockConnections[0].plaidAccessToken
      });
      expect(plaidClient.transactionsRecurringGet).toHaveBeenCalledWith({
        access_token: mockConnections[0].plaidAccessToken,
        account_ids: ['acc-123']
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        recurring_transactions: [mockTransactions.data]
      });
    });

    it('should handle no active connections', async () => {
      (getUserBankConnections as jest.Mock).mockResolvedValue([]);

      await getRecurringTransactions(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          error: 'NO_ACTIVE_CONNECTIONS'
        })
      );
    });

    it('should handle failed transactions fetch', async () => {
      (getUserBankConnections as jest.Mock).mockResolvedValue(mockConnections);
      
      const mockError = new Error('Plaid API error');
      (plaidClient.accountsGet as jest.Mock).mockRejectedValue(mockError);

      await getRecurringTransactions(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          error: 'NO_VALID_TRANSACTIONS'
        })
      );
    });
  });

  describe('getBankConnections', () => {
    it('should return user bank connections', async () => {
      const mockConnections = [
        { id: 'conn-123', status: 'active' },
        { id: 'conn-456', status: 'active' }
      ];
      (getUserBankConnections as jest.Mock).mockResolvedValue(mockConnections);

      await getBankConnections(mockReq, mockRes, mockNext);

      expect(getUserBankConnections).toHaveBeenCalledWith('test-session-id');
      expect(mockRes.json).toHaveBeenCalledWith({ connections: mockConnections });
    });
  });

  describe('unlinkBankConnection', () => {
    it('should unlink bank connection', async () => {
      const req = {
        ...mockReq,
        params: { id: 'conn-123' },
        body: { reason: 'user_requested' }
      } as Request<{ id: string }, unknown, { reason: string }>;

      await unlinkBankConnection(req, mockRes, mockNext);

      expect(unlinkBank).toHaveBeenCalledWith(
        'test-session-id',
        'conn-123',
        'user_requested'
      );
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });
  });
}); 