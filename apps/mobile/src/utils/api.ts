import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import { AuthResponse, SignInBody, SignUpBody } from '../types/auth';

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
      const { password: token } = credentials;
      config.headers.Authorization = `Bearer ${token}`;
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
      const credentials = await Keychain.getGenericPassword({
        service: 'auth'
      });

      if (!credentials) {
        throw new Error('No refresh token found');
      }

      // Get current session
      const response = await api.post<AuthResponse>('/auth/refresh', {
        refresh_token: credentials.password,
      });

      const { access_token } = response.data.session!;

      // Store new token
      await Keychain.setGenericPassword(
        'auth_user',
        access_token,
        {
          service: 'auth'
        }
      );

      // Update authorization header
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      
      processQueue(null, access_token);
      return api(originalRequest);
    } catch (refreshError) {
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
      if (response.data.session?.access_token) {
        await Keychain.setGenericPassword(
          'auth_user',
          response.data.session.access_token,
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
      if (response.data.session?.access_token) {
        await Keychain.setGenericPassword(
          'auth_user',
          response.data.session.access_token,
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
      await api.post('/auth/signout');
    } finally {
      // Always clear credentials on sign out
      await Keychain.resetGenericPassword({ service: 'auth' });
    }
  },

  async getMe(): Promise<AuthResponse> {
    try {
      const response = await api.get<AuthResponse>('/auth/me');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get user data');
      }
      throw error;
    }
  },
};

export default api;
