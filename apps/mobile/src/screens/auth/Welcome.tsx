/// <reference types="nativewind/types" />
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/auth';

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

const WelcomeScreen = ({ navigation }: WelcomeScreenProps) => {
  return (
    <View className="flex-1 bg-white">
      {/* Header Section */}
      <View className="flex-1 justify-center items-center px-8">
        <Text className="text-4xl font-bold text-black mb-4">
          Due
        </Text>
        <Text className="text-lg text-gray-600 text-center mb-8">
          Track and manage your recurring payments and subscriptions
        </Text>
      </View>

      {/* Buttons Section */}
      <View className="px-8 pb-12 space-y-4">
        <TouchableOpacity
          onPress={() => navigation.navigate('SignIn')}
          className="w-full bg-black py-4 rounded-xl"
        >
          <Text className="text-white text-center font-semibold text-lg">
            Sign In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('SignUp')}
          className="w-full bg-gray-100 py-4 rounded-xl"
        >
          <Text className="text-black text-center font-semibold text-lg">
            Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WelcomeScreen;
