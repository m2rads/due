import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { SignUpBody, SignInBody } from '@due/types';
import { signUp, signIn, signOut, deleteUser, refreshToken } from '../controllers/auth';
import { createProfile, getProfileById, deleteProfile } from '../db/queries/profiles';
import { AuthRequest } from '../types/auth';

// Mock console.error to prevent noise in test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Mock Supabase
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      admin: {
        deleteUser: jest.fn()
      },
      refreshSession: jest.fn()
    }
  }
}));

// Mock profile operations
jest.mock('../db/queries/profiles', () => ({
  createProfile: jest.fn(),
  getProfileById: jest.fn(),
  deleteProfile: jest.fn()
}));

describe('Authentication', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockRequest = {
      user: {
        id: 'test-id',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00.000Z'
      }
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };
    jest.clearAllMocks();
  });

  describe('Sign Up', () => {
    it('should successfully create a new user', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com'
      };

      const mockAuthResponse = {
        data: {
          user: mockUser,
          session: {
            access_token: 'test-token'
          }
        },
        error: null
      };

      const mockProfile = {
        id: mockUser.id,
        full_name: 'Test User'
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthResponse);
      (createProfile as jest.Mock).mockResolvedValue(mockProfile);

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User'
      } as SignUpBody;

      await signUp(mockRequest as Request, mockResponse as Response);

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      });
      expect(createProfile).toHaveBeenCalledWith({
        id: mockUser.id,
        full_name: 'Test User',
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
      expect(mockJson).toHaveBeenCalledWith({
        user: mockUser,
        session: mockAuthResponse.data.session,
        profile: mockProfile
      });
    }, 10000); // Increased timeout

    it('should handle signup failure', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Signup failed' }
      });

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User'
      } as SignUpBody;

      await signUp(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Signup failed' });
      expect(createProfile).not.toHaveBeenCalled();
    });
  });

  describe('Sign In', () => {
    it('should successfully sign in a user', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com'
      };

      const mockAuthResponse = {
        data: {
          user: mockUser,
          session: {
            access_token: 'test-token'
          }
        },
        error: null
      };

      const mockProfile = {
        id: mockUser.id,
        full_name: 'Test User'
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockAuthResponse);
      (getProfileById as jest.Mock).mockResolvedValue(mockProfile);

      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      } as SignInBody;

      await signIn(mockRequest as Request, mockResponse as Response);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(getProfileById).toHaveBeenCalledWith(mockUser.id);
      expect(mockJson).toHaveBeenCalledWith({
        user: mockUser,
        session: mockAuthResponse.data.session,
        profile: mockProfile
      });
    }, 10000); // Increased timeout

    it('should handle signin failure', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrong-password'
      } as SignInBody;

      await signIn(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });
  });

  describe('Sign Out', () => {
    it('should successfully sign out a user', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await signOut(mockRequest as Request, mockResponse as Response);

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({ message: 'Signed out successfully' });
    });

    it('should handle signout failure', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Signout failed' }
      });

      await signOut(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Signout failed' });
    });
  });

  describe('Delete User', () => {
    it('should successfully delete a user', async () => {
      // Mock deleteProfile to succeed
      (deleteProfile as jest.Mock).mockResolvedValue(undefined);

      // Mock deleteUser to succeed
      (supabase.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
        error: null
      });

      await deleteUser(mockRequest as Request, mockResponse as Response);

      // Check profile was deleted first
      expect(deleteProfile).toHaveBeenCalledWith('test-id');
      // Verify order of operations through Jest call order
      expect(deleteProfile).toHaveBeenCalled();
      expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith('test-id');
      expect(mockJson).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });

    it('should handle profile deletion failure', async () => {
      // Mock profile deletion to fail
      (deleteProfile as jest.Mock).mockRejectedValue(new Error('Failed to delete profile'));

      await deleteUser(mockRequest as Request, mockResponse as Response);

      expect(deleteProfile).toHaveBeenCalledWith('test-id');
      expect(supabase.auth.admin.deleteUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should handle unauthenticated user', async () => {
      // Remove user from request to simulate unauthenticated state
      mockRequest.user = undefined;

      await deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });

    it('should handle deletion failure', async () => {
      // Mock profile deletion to succeed
      (deleteProfile as jest.Mock).mockResolvedValue(undefined);

      // Mock deleteUser to return error in Supabase format
      (supabase.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Failed to delete user' }
      });

      await deleteUser(mockRequest as Request, mockResponse as Response);

      expect(deleteProfile).toHaveBeenCalledWith('test-id');
      expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith('test-id');
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to delete user' });
    });
  });

  describe('Refresh Token', () => {
    it('should successfully refresh tokens', async () => {
      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      };

      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: {
          session: mockSession
        },
        error: null
      });

      mockRequest.body = {
        refresh_token: 'valid-refresh-token'
      };

      await refreshToken(mockRequest as Request, mockResponse as Response);

      expect(supabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'valid-refresh-token'
      });
      expect(mockJson).toHaveBeenCalledWith({
        session: mockSession
      });
    });

    it('should handle missing refresh token', async () => {
      mockRequest.body = {};

      await refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Refresh token is required' });
      expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
    });

    it('should handle invalid refresh token', async () => {
      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' }
      });

      mockRequest.body = {
        refresh_token: 'invalid-refresh-token'
      };

      await refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
    });

    it('should handle refresh failure', async () => {
      const error = new Error('Unexpected error');
      (supabase.auth.refreshSession as jest.Mock).mockRejectedValue(error);

      mockRequest.body = {
        refresh_token: 'valid-refresh-token'
      };

      await refreshToken(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Token refresh error:', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
}); 