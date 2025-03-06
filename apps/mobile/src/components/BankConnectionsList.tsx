/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native';
import { BankConnection } from '@due/types';
import { AlertTriangle, CheckCircle2, XCircle, RefreshCcw, Trash2 } from 'lucide-react-native';
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
        <View className="flex-row items-center bg-red-100 px-2 py-1 rounded-full">
          <XCircle size={14} color="#EF4444" />
          <Text className="text-red-600 ml-1 text-xs font-medium">Disconnected</Text>
        </View>
      );
    }

    if (connection.itemStatus === 'error') {
      return (
        <View className="flex-row items-center bg-amber-100 px-2 py-1 rounded-full">
          <AlertTriangle size={14} color="#F59E0B" />
          <Text className="text-amber-600 ml-1 text-xs font-medium">Error</Text>
        </View>
      );
    }

    return (
      <View className="flex-row items-center bg-emerald-100 px-2 py-1 rounded-full">
        <CheckCircle2 size={14} color="#10B981" />
        <Text className="text-emerald-600 ml-1 text-xs font-medium">Connected</Text>
      </View>
    );
  };

  return (
    <>
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {connections.map(connection => (
          <View
            key={connection.id}
            className="bg-white p-5 mb-4 rounded-xl shadow-sm border border-gray-100"
          >
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <View className="h-10 w-1.5 bg-gray-800 rounded mr-3" />
                <Text className="text-lg font-semibold text-gray-800">
                  {connection.institutionName}
                </Text>
              </View>
              {renderStatus(connection)}
            </View>

            {connection.errorMessage && (
              <View className="bg-red-50 p-3 rounded-lg mb-4">
                <Text className="text-red-600 text-sm">
                  {connection.errorMessage}
                </Text>
              </View>
            )}

            <View className="flex-row justify-end items-center mt-3">
              {(connection.status === 'inactive' || connection.itemStatus === 'error') && (
                <TouchableOpacity
                  onPress={() => setSelectedConnection(connection)}
                  className="flex-row items-center bg-gray-800 px-4 py-2 rounded-lg mr-3"
                >
                  <RefreshCcw size={16} color="#FFFFFF" />
                  <Text className="text-white ml-2 font-medium">Reconnect</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleUnlink(connection)}
                className="flex-row items-center px-4 py-2 border border-red-200 rounded-lg"
              >
                <Trash2 size={16} color="#EF4444" />
                <Text className="text-red-500 ml-2 font-medium">Unlink</Text>
              </TouchableOpacity>
            </View>
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