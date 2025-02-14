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

type SignUpScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
};

const SignUpScreen = ({ navigation }: SignUpScreenProps) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signUp, isLoading, error, clearError } = useAuth();

  const handleSignUp = async () => {
    if (fullName.trim() === '' || email.trim() === '' || password === '') {
      // TODO: Show validation error
      return;
    }
    await signUp({ email, password, full_name: fullName });
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
              <Text className="text-gray-700 text-base mb-2">Full Name</Text>
              <TextInput
                className="w-full bg-gray-50 px-4 py-3 rounded-xl text-black"
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                onFocus={clearError}
              />
            </View>

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
                placeholder="Create a password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={clearError}
              />
            </View>

            <TouchableOpacity
              onPress={handleSignUp}
              disabled={isLoading}
              className="w-full bg-black py-4 rounded-xl mt-4"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-600">Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text className="text-black font-semibold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUpScreen;
