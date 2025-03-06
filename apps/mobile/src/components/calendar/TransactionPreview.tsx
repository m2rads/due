/// <reference types="nativewind/types" />

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { TransactionPreviewProps } from '../../types/calendar';
import TransactionItem from './TransactionItem';

const TransactionPreview: React.FC<TransactionPreviewProps> = ({
  selectedDate,
  selectedDayTransactions,
  upcomingTransactions,
  isLoading,
  onViewAllTransactions
}) => {
  return (
    <View className="mx-4 bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <Text className="text-base font-semibold text-black">
          {selectedDayTransactions.length > 0 
            ? `${format(selectedDate, 'MMMM d, yyyy')} (${selectedDayTransactions.length})` 
            : 'Upcoming Transactions'}
        </Text>
      </View>
      
      {isLoading ? (
        <View className="py-3 items-center">
          <ActivityIndicator size="small" color="#777777" />
        </View>
      ) : selectedDayTransactions.length > 0 ? (
        <>
          <ScrollView className="max-h-[300px]" nestedScrollEnabled={true}>
            {selectedDayTransactions.map((item, index) => (
              <TransactionItem 
                key={`${item.description}-${index}`}
                transaction={item}
                onPress={onViewAllTransactions}
              />
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            className="p-3 items-center border-t border-gray-100"
            onPress={() => onViewAllTransactions(selectedDate)}
          >
            <Text className="font-medium text-black">See All Details</Text>
          </TouchableOpacity>
        </>
      ) : upcomingTransactions.length > 0 ? (
        <>
          <ScrollView className="max-h-[300px]" nestedScrollEnabled={true}>
            {upcomingTransactions.slice(0, 5).map((item, index) => (
              <TransactionItem 
                key={`${item.description}-${index}`}
                transaction={item}
                onPress={onViewAllTransactions}
              />
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            className="p-3 items-center border-t border-gray-100"
            onPress={() => {
              if (upcomingTransactions.length > 0) {
                onViewAllTransactions(parseISO(upcomingTransactions[0].predicted_next_date));
              }
            }}
          >
            <Text className="font-medium text-black">View All Upcoming</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View className="p-4 items-center">
          <Text className="text-gray-500 text-sm">No transactions to display</Text>
        </View>
      )}
    </View>
  );
};

export default TransactionPreview; 