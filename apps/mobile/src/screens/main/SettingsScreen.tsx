/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Alert, ScrollView, Switch, GestureResponderEvent } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { 
  LogOut, 
  Trash2, 
  User, 
  Bell, 
  Moon, 
  Shield, 
  HelpCircle,
  ChevronRight,
  FileText,
  Mail
} from 'lucide-react-native';

// Define the shape of the setting item props
interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string | null;
  showToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
  showChevron?: boolean;
  onPress?: (() => void) | undefined;
  textColor?: string;
}

const SettingsScreen = () => {
  const { signOut, deleteAccount, user, profile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  
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

  // Setting toggle handlers
  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    // Here you would implement actual notification toggling logic
  };

  const toggleDarkMode = () => {
    setDarkModeEnabled(!darkModeEnabled);
    // Here you would implement actual dark mode toggling logic
  };

  // Format the user name
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  
  const renderSettingItem = (props: SettingItemProps) => {
    const { 
      icon, 
      title, 
      subtitle = null, 
      showToggle = false, 
      toggleValue = false,
      onToggle,
      showChevron = false,
      onPress,
      textColor = 'text-gray-800'
    } = props;

    return (
      <TouchableOpacity 
        className="flex-row items-center py-4 px-5 border-b border-gray-100"
        onPress={onPress}
        disabled={!onPress}
      >
        <View className="w-8 items-center mr-3">
          {icon}
        </View>
        <View className="flex-1">
          <Text className={`font-medium ${textColor}`}>{title}</Text>
          {subtitle && <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>}
        </View>
        {showToggle && onToggle && (
          <Switch 
            value={toggleValue} 
            onValueChange={onToggle}
            trackColor={{ false: '#d1d5db', true: '#9ca3af' }}
            thumbColor={toggleValue ? '#4b5563' : '#f3f4f6'}
          />
        )}
        {showChevron && (
          <ChevronRight size={18} color="#9ca3af" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Profile section */}
      <View className="bg-white rounded-xl shadow-sm mx-4 mt-6 mb-4 overflow-hidden">
        <View className="bg-gray-800 px-5 py-4">
          <Text className="text-white font-semibold text-base">Profile</Text>
        </View>
        
        <View className="px-5 py-5 flex-row items-center">
          <View className="bg-gray-200 w-16 h-16 rounded-full items-center justify-center mr-4">
            <User size={32} color="#374151" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800">{userName}</Text>
            <Text className="text-sm text-gray-500">{userEmail}</Text>
          </View>
        </View>
      </View>
      
      {/* App Settings section */}
      <View className="bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden">
        <View className="bg-gray-800 px-5 py-4">
          <Text className="text-white font-semibold text-base">App Settings</Text>
        </View>
        
        {renderSettingItem({
          icon: <Bell size={20} color="#374151" />,
          title: "Notifications",
          subtitle: "Receive alerts about upcoming payments",
          showToggle: true,
          toggleValue: notificationsEnabled,
          onToggle: toggleNotifications
        })}
        
        {renderSettingItem({
          icon: <Moon size={20} color="#374151" />,
          title: "Dark Mode",
          subtitle: "Change app appearance",
          showToggle: true,
          toggleValue: darkModeEnabled,
          onToggle: toggleDarkMode
        })}
      </View>
      
      {/* Help & Support */}
      <View className="bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden">
        <View className="bg-gray-800 px-5 py-4">
          <Text className="text-white font-semibold text-base">Help & Support</Text>
        </View>
        
        {renderSettingItem({
          icon: <HelpCircle size={20} color="#374151" />,
          title: "FAQ",
          showChevron: true,
          onPress: () => console.log("FAQ pressed")
        })}
        
        {renderSettingItem({
          icon: <Mail size={20} color="#374151" />,
          title: "Contact Support",
          showChevron: true,
          onPress: () => console.log("Contact Support pressed")
        })}
        
        {renderSettingItem({
          icon: <FileText size={20} color="#374151" />,
          title: "Privacy Policy",
          showChevron: true,
          onPress: () => console.log("Privacy Policy pressed")
        })}
        
        {renderSettingItem({
          icon: <Shield size={20} color="#374151" />,
          title: "Terms of Service",
          showChevron: true,
          onPress: () => console.log("Terms of Service pressed"),
          subtitle: "Last updated: June 2023"
        })}
      </View>
      
      {/* Account Actions */}
      <View className="bg-white rounded-xl shadow-sm mx-4 mb-6 overflow-hidden">
        <View className="bg-gray-800 px-5 py-4">
          <Text className="text-white font-semibold text-base">Account</Text>
        </View>
        
        {renderSettingItem({
          icon: <LogOut size={20} color="#EF4444" />,
          title: "Log Out",
          textColor: "text-red-500",
          onPress: signOut
        })}
        
        {renderSettingItem({
          icon: <Trash2 size={20} color="#991B1B" />,
          title: "Delete Account",
          subtitle: "All your data will be permanently removed",
          textColor: "text-red-700",
          onPress: confirmDelete
        })}
      </View>
      
      <View className="pb-8 px-4">
        <Text className="text-center text-gray-400 text-xs">
          Due App v1.0.1
        </Text>
      </View>
    </ScrollView>
  );
};

export default SettingsScreen; 