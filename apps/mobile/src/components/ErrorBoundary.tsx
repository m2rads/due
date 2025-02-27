/// <reference types="nativewind/types" />
import React, { Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  onReset?: () => Promise<void>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = async () => {
    if (this.props.onReset) {
      await this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center p-8 bg-white">
          <Text className="text-2xl font-bold text-black mb-4">
            Oops! Something went wrong
          </Text>
          <Text className="text-base text-gray-600 text-center mb-8">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            className="bg-black py-4 px-8 rounded-xl"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to access auth context
export const ErrorBoundaryWrapper: React.FC<Props> = ({ children }) => {
  const auth = useAuth();

  const handleReset = async () => {
    // Sign out on critical errors
    await auth.signOut();
  };

  return <ErrorBoundary onReset={handleReset}>{children}</ErrorBoundary>;
};

export default ErrorBoundaryWrapper; 