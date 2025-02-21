/// <reference types="nativewind/types" />
import React from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Trash2 } from 'lucide-react-native';

const SettingsScreen = () => {
  const { signOut, deleteAccount } = useAuth();

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to delete account. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: handleDeleteAccount,
          style: 'destructive'
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="mt-8 mx-6">
        <TouchableOpacity 
          onPress={signOut}
          className="flex-row items-center justify-center bg-red-500 py-5 rounded-xl mb-6"
        >
          <LogOut size={24} color="#fff" className="mr-2" />
          <Text className="text-white font-semibold text-lg">Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={confirmDelete}
          className="flex-row items-center justify-center bg-red-800 py-5 rounded-xl"
        >
          <Trash2 size={24} color="#fff" className="mr-2" />
          <Text className="text-white font-semibold text-lg">Delete Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SettingsScreen; 