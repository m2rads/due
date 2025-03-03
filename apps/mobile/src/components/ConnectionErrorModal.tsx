/// <reference types="nativewind/types" />
import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BankConnection } from '@due/types';
import { AlertCircle, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  connection: BankConnection | null;
  isReconnecting: boolean;
  onReconnect: () => void;
  onClose: () => void;
}

const ConnectionErrorModal: React.FC<Props> = ({
  visible,
  connection,
  isReconnecting,
  onReconnect,
  onClose
}) => {
  if (!connection) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-6">
        <View className="bg-white rounded-2xl w-full overflow-hidden shadow-lg">
          {/* Header */}
          <View className="bg-gray-800 px-5 py-4 flex-row justify-between items-center">
            <Text className="text-white font-semibold text-base">
              Connection Error
            </Text>
            <TouchableOpacity onPress={onClose} disabled={isReconnecting}>
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <View className="p-6">
            <View className="items-center mb-5">
              <View className="bg-red-100 p-3 rounded-full mb-2">
                <AlertCircle size={36} color="#EF4444" />
              </View>
              
              <Text className="text-xl font-bold text-gray-800 text-center mb-1">
                {connection.institutionName}
              </Text>
              
              <Text className="text-gray-600 text-center">
                This account needs to be reconnected
              </Text>
            </View>
            
            {connection.errorMessage && (
              <View className="bg-red-50 p-4 rounded-lg mb-5">
                <Text className="text-red-600 text-center">
                  {connection.errorMessage}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={onReconnect}
              disabled={isReconnecting}
              className={`py-3 rounded-lg flex-row items-center justify-center mb-3 ${
                isReconnecting ? 'bg-gray-300' : 'bg-gray-800'
              }`}
            >
              {isReconnecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-medium">
                  Reconnect
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              disabled={isReconnecting}
              className="py-3"
            >
              <Text className="text-gray-600 text-center font-medium">
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConnectionErrorModal; 