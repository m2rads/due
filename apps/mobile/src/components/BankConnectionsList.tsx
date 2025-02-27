/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native';
import { BankConnection } from '@due/types';
import { AlertTriangle, CheckCircle2, XCircle, RefreshCcw } from 'lucide-react-native';
import ConnectionErrorModal from './ConnectionErrorModal';

interface Props {
  connections: BankConnection[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onReconnect: (connection: BankConnection) => void;
  onUnlink: (connection: BankConnection) => void;
}

const BankConnectionsList: React.FC<Props> = ({
  connections,
  isRefreshing,
  onRefresh,
  onReconnect,
  onUnlink
}) => {
  const [selectedConnection, setSelectedConnection] = useState<BankConnection | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleUnlink = (connection: BankConnection) => {
    Alert.alert(
      'Unlink Bank Account',
      `Are you sure you want to unlink ${connection.institutionName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive',
          onPress: () => onUnlink(connection)
        }
      ]
    );
  };

  const handleReconnect = async (connection: BankConnection) => {
    setIsReconnecting(true);
    try {
      await onReconnect(connection);
    } finally {
      setIsReconnecting(false);
      setSelectedConnection(null);
    }
  };

  const renderStatus = (connection: BankConnection) => {
    if (connection.status === 'inactive') {
      return (
        <View className="flex-row items-center">
          <XCircle size={16} color="#EF4444" />
          <Text className="text-red-500 ml-1">Disconnected</Text>
        </View>
      );
    }

    if (connection.itemStatus === 'error') {
      return (
        <View className="flex-row items-center">
          <AlertTriangle size={16} color="#F59E0B" />
          <Text className="text-amber-500 ml-1">Error</Text>
        </View>
      );
    }

    return (
      <View className="flex-row items-center">
        <CheckCircle2 size={16} color="#10B981" />
        <Text className="text-emerald-600 ml-1">Connected</Text>
      </View>
    );
  };

  return (
    <>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {connections.map(connection => (
          <View
            key={connection.id}
            className="bg-white p-4 mb-4 rounded-xl shadow"
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-lg font-semibold">
                {connection.institutionName}
              </Text>
              {renderStatus(connection)}
            </View>

            <View className="flex-row justify-between items-center mt-4">
              {(connection.status === 'inactive' || connection.itemStatus === 'error') && (
                <TouchableOpacity
                  onPress={() => setSelectedConnection(connection)}
                  className="flex-row items-center bg-black px-4 py-2 rounded-lg"
                >
                  <RefreshCcw size={16} color="#FFFFFF" />
                  <Text className="text-white ml-2">Reconnect</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleUnlink(connection)}
                className="flex-row items-center"
              >
                <Text className="text-red-500">Unlink</Text>
              </TouchableOpacity>
            </View>

            {connection.errorMessage && (
              <Text className="text-red-500 mt-2 text-sm">
                {connection.errorMessage}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      <ConnectionErrorModal
        visible={!!selectedConnection}
        connection={selectedConnection}
        isReconnecting={isReconnecting}
        onReconnect={() => selectedConnection && handleReconnect(selectedConnection)}
        onClose={() => setSelectedConnection(null)}
      />
    </>
  );
};

export default BankConnectionsList; 