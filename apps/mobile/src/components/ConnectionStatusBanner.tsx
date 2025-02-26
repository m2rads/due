import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, XCircle } from 'lucide-react-native';
import { BankConnection } from '@due/types';

interface Props {
  erroredConnections: BankConnection[];
  onReconnect: (connection: BankConnection) => void;
}

const ConnectionStatusBanner: React.FC<Props> = ({
  erroredConnections,
  onReconnect
}) => {
  if (erroredConnections.length === 0) return null;

  return (
    <View className="bg-red-50 p-4 mb-4">
      <View className="flex-row items-center mb-2">
        {erroredConnections[0].status === 'inactive' ? (
          <XCircle size={20} color="#EF4444" />
        ) : (
          <AlertTriangle size={20} color="#F59E0B" />
        )}
        <Text className="text-red-700 font-medium ml-2">
          Connection Issues
        </Text>
      </View>

      <Text className="text-red-600 mb-3">
        {erroredConnections.length === 1
          ? `${erroredConnections[0].institutionName} needs attention`
          : `${erroredConnections.length} bank connections need attention`}
      </Text>

      <TouchableOpacity
        onPress={() => onReconnect(erroredConnections[0])}
        className="bg-red-100 py-2 px-4 rounded-lg self-start"
      >
        <Text className="text-red-700 font-medium">
          Fix Connection Issues
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ConnectionStatusBanner; 