/// <reference types="nativewind/types" />

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { TransactionItemProps } from '../types/calendar';

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onPress }) => {
  // Parse the date
  const transactionDate = parseISO(transaction.predicted_next_date);
  
  // Format currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <TouchableOpacity
      className="flex-row justify-between items-center py-3 px-4 border-b border-gray-100"
      onPress={() => onPress(transactionDate)}
    >
      <View className="flex-1">
        <Text className="text-xs text-gray-500 mb-1">
          {format(transactionDate, 'MMM d, yyyy')}
        </Text>
        <Text className="text-sm font-medium text-black mb-0.5">
          {transaction.merchant_name || transaction.description}
        </Text>
        <Text className="text-xs text-gray-500">
          {transaction.frequency.charAt(0).toUpperCase() + transaction.frequency.slice(1)}
        </Text>
      </View>
      <View className="flex-row items-center">
        {transaction.type === 'inflow' ? (
          <ArrowDownRight 
            size={16} 
            color="#333333"
            className="mr-2" 
          />
        ) : (
          <ArrowUpRight 
            size={16} 
            color="#555555"
            className="mr-2" 
          />
        )}
        <Text 
          className={`text-base font-semibold ${
            transaction.type === 'inflow' ? 'text-gray-800' : 'text-gray-600'
          }`}
        >
          {formatAmount(transaction.average_amount.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default TransactionItem; 