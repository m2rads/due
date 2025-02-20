/// <reference types="nativewind/types" />
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react-native';

const SettingsScreen = () => {
  const { signOut } = useAuth();

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <TouchableOpacity 
        onPress={signOut}
        className="flex-row items-center justify-center bg-red-500 p-4 rounded-xl"
      >
        <LogOut size={24} color="#fff" className="mr-2" />
        <Text className="text-white font-semibold text-lg">Log Out</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SettingsScreen; 