import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import { AuthResponse, SignInBody, SignUpBody } from '@due/types';

interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const BASE_URL = Platform.OS === 'ios' ? 'http://localhost:8080' : 'http://10.0.2.2:8080';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're refreshing the token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'auth'
    });
    if (credentials) {
      // Use username as access token
      config.headers.Authorization = `Bearer ${credentials.username}`;
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }
  return config;
});

// Handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalAxiosRequestConfig;
    
    // If error is not 401 or request already retried, reject
    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Don't retry auth endpoints to prevent loops
    if (originalRequest.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      try {
        const token = await new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    isRefreshing = true;

    try {
      console.log('Token expired, attempting refresh...');
      const credentials = await Keychain.getGenericPassword({
        service: 'auth'
      });

      if (!credentials) {
        throw new Error('No refresh token found');
      }

      // Use refresh token (password) to get new tokens
      const response = await api.post<AuthResponse>('/auth/refresh', {
        refresh_token: credentials.password,
      });

      if (!response.data.session?.access_token || !response.data.session?.refresh_token) {
        throw new Error('Invalid refresh response');
      }

      const { access_token, refresh_token } = response.data.session;
      console.log('Token refresh successful');

      // Store both new tokens
      await Keychain.setGenericPassword(
        access_token,
        refresh_token,
        {
          service: 'auth'
        }
      );

      // Update authorization header with new access token
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      
      processQueue(null, access_token);
      return api(originalRequest);
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      processQueue(refreshError, null);
      // Clear stored credentials on refresh error
      await Keychain.resetGenericPassword({ service: 'auth' });
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Auth API functions
export const authAPI = {
  async signUp(data: SignUpBody): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/signup', data);
      if (response.data.session?.access_token && response.data.session?.refresh_token) {
        // Store access token as username and refresh token as password
        await Keychain.setGenericPassword(
          response.data.session.access_token,
          response.data.session.refresh_token,
          {
            service: 'auth'
          }
        );
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Sign up failed');
      }
      throw error;
    }
  },

  async signIn(credentials: SignInBody): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/signin', credentials);
      if (response.data.session?.access_token && response.data.session?.refresh_token) {
        // Store access token as username and refresh token as password
        await Keychain.setGenericPassword(
          response.data.session.access_token,
          response.data.session.refresh_token,
          {
            service: 'auth'
          }
        );
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Sign in failed');
      }
      throw error;
    }
  },

  async signOut(): Promise<void> {
    try {
      // Try to sign out on the server
      await api.post('/auth/signout');
    } catch (error) {
      // Ignore "No refresh token" errors as this is expected in some cases (like after account deletion)
      if (error instanceof Error && error.message !== 'No refresh token found') {
        console.error('Sign out error:', error);
      }
    } finally {
      // Always clear credentials regardless of server response
      await Keychain.resetGenericPassword({ service: 'auth' });
    }
  },

  async clearAuthState(): Promise<void> {
    await Keychain.resetGenericPassword({ service: 'auth' });
  },

  async deleteAccount(): Promise<void> {
    try {
      await api.delete('/auth/user');
      // Clear credentials after successful deletion
      await this.clearAuthState();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to delete account');
      }
      throw error;
    }
  },

  async getMe(): Promise<AuthResponse | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'auth'
      });

      if (!credentials) {
        // No credentials is a normal state, not an error
        return null;
      }

      const response = await api.get<AuthResponse>('/auth/me');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // Token expired/invalid is a normal state, just clear and return null
          await this.clearAuthState();
          return null;
        }
        
        // Only log non-auth errors as they might indicate actual issues
        if (error.response?.status !== 401) {
          console.error('Unexpected API error during auth check:', {
            status: error.response?.status,
            data: error.response?.data
          });
        }
      } else {
        console.error('Unexpected error during auth check:', error);
      }
      return null;
    }
  },
};

export default api;
