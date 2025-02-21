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
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';

type SignInScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;
};

const SignInScreen = ({ navigation }: SignInScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error, clearError } = useAuth();

  const handleSignIn = async () => {
    if (email.trim() === '' || password === '') {
      // TODO: Show validation error
      return;
    }
    await signIn({ email, password });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8 pt-8">
          {error && (
            <View className="bg-red-50 p-4 rounded-xl mb-4">
              <Text className="text-red-800 text-sm">{error}</Text>
            </View>
          )}

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
                onFocus={clearError}
              />
            </View>

            <View>
              <Text className="text-gray-700 text-base mb-2">Password</Text>
              <TextInput
                className="w-full bg-gray-50 px-4 py-3 rounded-xl text-black"
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={clearError}
              />
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              className="self-end"
            >
              <Text className="text-gray-600">Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isLoading}
              className="w-full bg-black py-4 rounded-xl mt-4"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-600">Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text className="text-black font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignInScreen;
