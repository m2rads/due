import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BankConnection } from '@due/types';
import { AlertCircle } from 'lucide-react-native';

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
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-2xl w-[90%] p-6">
          <View className="items-center mb-4">
            <AlertCircle size={48} color="#EF4444" />
          </View>
          
          <Text className="text-xl font-semibold text-center mb-2">
            Connection Error
          </Text>
          
          <Text className="text-gray-600 text-center mb-4">
            {connection.institutionName} needs to be reconnected
          </Text>
          
          {connection.errorMessage && (
            <Text className="text-red-500 text-center mb-4">
              {connection.errorMessage}
            </Text>
          )}

          <TouchableOpacity
            onPress={onReconnect}
            disabled={isReconnecting}
            className={`py-4 rounded-xl flex-row items-center justify-center mb-3 ${
              isReconnecting ? 'bg-gray-400' : 'bg-black'
            }`}
          >
            {isReconnecting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold">
                Reconnect
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            disabled={isReconnecting}
            className="py-4"
          >
            <Text className="text-gray-600 text-center">
              Dismiss
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ConnectionErrorModal; 