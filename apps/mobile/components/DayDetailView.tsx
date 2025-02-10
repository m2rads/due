/// <reference types="nativewind/types" />
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { format, parseISO } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon } from 'lucide-react-native';

interface Amount {
  amount: number;
}

interface TransactionStream {
  description: string;
  merchant_name: string;
  average_amount: Amount;
  frequency: string;
  category: string[];
  last_date: string;
  predicted_next_date: string;
  is_active: boolean;
  status: string;
  type: 'inflow' | 'outflow';
}

const DayDetailView = ({ route }: any) => {
  const { date: dateString, transactions } = route.params;
  const date = parseISO(dateString);
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const totalInflow = transactions
    .filter(t => t.type === 'inflow')
    .reduce((sum, t) => sum + t.average_amount.amount, 0);

  const totalOutflow = transactions
    .filter(t => t.type === 'outflow')
    .reduce((sum, t) => sum + t.average_amount.amount, 0);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Date Header */}
      <View className="bg-white p-6 border-b border-gray-100">
        <View className="flex-row items-center justify-center mb-2">
          <CalendarIcon size={20} color="#4B5563" />
          <Text className="text-lg font-semibold text-gray-700 ml-2">
            {formattedDate}
          </Text>
        </View>
        
        {/* Summary Cards */}
        <View className="flex-row justify-between mt-4">
          <View className="flex-1 bg-green-50 rounded-xl p-4 mr-2">
            <View className="flex-row items-center">
              <ArrowUpRight size={20} color="#059669" />
              <Text className="text-sm font-medium text-green-800 ml-1">Income</Text>
            </View>
            <Text className="text-lg font-bold text-green-700 mt-1">
              {formatAmount(totalInflow)}
            </Text>
          </View>
          
          <View className="flex-1 bg-red-50 rounded-xl p-4 ml-2">
            <View className="flex-row items-center">
              <ArrowDownRight size={20} color="#DC2626" />
              <Text className="text-sm font-medium text-red-800 ml-1">Expenses</Text>
            </View>
            <Text className="text-lg font-bold text-red-700 mt-1">
              {formatAmount(totalOutflow)}
            </Text>
          </View>
        </View>
      </View>

      {/* Transactions List */}
      <View className="p-4">
        {transactions.map((transaction: TransactionStream, index: number) => (
          <View 
            key={index}
            className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {transaction.merchant_name || transaction.description}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {transaction.category.join(' › ')}
                </Text>
              </View>
              <Text 
                className={`text-base font-bold ${
                  transaction.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {transaction.type === 'inflow' ? '+' : '-'}
                {formatAmount(transaction.average_amount.amount)}
              </Text>
            </View>
            
            <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-100">
              <View>
                <Text className="text-xs text-gray-500">Frequency</Text>
                <Text className="text-sm text-gray-700 capitalize">
                  {transaction.frequency.toLowerCase()}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-500">Status</Text>
                <Text className="text-sm text-gray-700 capitalize">
                  {transaction.status.toLowerCase()}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-500">Last Transaction</Text>
                <Text className="text-sm text-gray-700">
                  {format(new Date(transaction.last_date), 'MMM d, yyyy')}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default DayDetailView; 