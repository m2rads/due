import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { SignUpBody, SignInBody } from '../types/auth';
import { signUp, signIn, signOut, deleteUser } from '../controllers/auth';
import { createProfile, getProfileById } from '../db/queries/profiles';

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
      }
    }
  }
}));

// Mock profile operations
jest.mock('../db/queries/profiles', () => ({
  createProfile: jest.fn(),
  getProfileById: jest.fn()
}));

describe('Authentication', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockRequest = {};
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
      // Mock getUser to return a valid user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { 
          user: { 
            id: 'test-id',
            email: 'test@example.com'
          }
        },
        error: null
      });

      // Mock deleteUser to succeed
      (supabase.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
        error: null
      });

      await deleteUser(mockRequest as Request, mockResponse as Response);

      expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith('test-id');
      expect(mockJson).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });

    it('should handle unauthenticated user', async () => {
      // Mock getUser to return no user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      await deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User not authenticated' });
    });

    it('should handle deletion failure', async () => {
      // Mock getUser to return a valid user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { 
          user: { 
            id: 'test-id',
            email: 'test@example.com'
          }
        },
        error: null
      });

      // Mock deleteUser to fail
      (supabase.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
        error: { message: 'Failed to delete user' }
      });

      await deleteUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to delete user' });
    });
  });
}); 