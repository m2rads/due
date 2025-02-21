/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/auth';
import Toast from 'react-native-toast-message';

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen = ({ navigation }: ForgotPasswordScreenProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (email.trim() === '') {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
      });
      return;
    }

    setIsLoading(true);
    // TODO: Implement password reset functionality
    setTimeout(() => {
      setIsLoading(false);
      Toast.show({
        type: 'success',
        text1: 'Check your email',
        text2: 'Instructions to reset your password have been sent to your email',
      });
      navigation.navigate('SignIn');
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        <View className="mb-8">
          <Text className="text-2xl font-bold text-black mb-2">
            Reset Password
          </Text>
          <Text className="text-gray-600">
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-gray-700 text-base mb-2">Email</Text>
            <TextInput
              className="w-full bg-gray-50 px-4 py-3 rounded-xl text-black"
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={isLoading}
            className="w-full bg-black py-4 rounded-xl"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">
                Send Instructions
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn')}
            className="mt-4"
          >
            <Text className="text-gray-600 text-center">
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
