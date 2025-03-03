/// <reference types="nativewind/types" />
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { format, parseISO } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, Clock, Tag, RefreshCw, ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

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
  institutionName?: string;
}

// Custom header component
const Header = ({ title, showBack = true }: { title: string, showBack?: boolean }) => {
  const navigation = useNavigation();
  
  return (
    <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200 flex-row items-center">
      {showBack && (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="mr-2 p-1"
        >
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
      )}
      <Text className="text-xl font-bold text-gray-800 flex-1">
        {title}
      </Text>
    </View>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'active' || status === 'ACTIVE') {
    return null; // No badge for active transactions
  }
  
  return (
    <View className="bg-red-100 px-2 py-0.5 rounded-full">
      <Text className="text-xs font-medium text-red-800">
        {status.toUpperCase()}
      </Text>
    </View>
  );
};

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

  // Group transactions by institution
  const transactionsByBank = transactions.reduce((groups: Record<string, TransactionStream[]>, transaction: TransactionStream) => {
    // Use institutionName or fallback to "Unknown Bank" if missing
    const bankName = transaction.institutionName || 'Unknown Bank';
    
    if (!groups[bankName]) {
      groups[bankName] = [];
    }
    
    groups[bankName].push(transaction);
    return groups;
  }, {} as Record<string, TransactionStream[]>);

  // Calculate totals for all transactions
  const totalInflow = transactions
    .filter((t: TransactionStream) => t.type === 'inflow')
    .reduce((sum: number, t: TransactionStream) => sum + t.average_amount.amount, 0);

  const totalOutflow = transactions
    .filter((t: TransactionStream) => t.type === 'outflow')
    .reduce((sum: number, t: TransactionStream) => sum + t.average_amount.amount, 0);

  return (
    <View className="flex-1 bg-gray-100">
      <Header title="Daily Transactions" />
      
      <ScrollView className="flex-1 px-4 py-4">
        {/* Date Summary Card */}
        <View className="bg-white rounded-xl shadow-md mb-5 overflow-hidden">
          <View className="bg-gray-800 px-5 py-4">
            <Text className="text-white font-semibold text-center text-lg">
              {formattedDate}
            </Text>
          </View>
          
          <View className="flex-row py-4 px-2">
            <View className="flex-1 items-center border-r border-gray-200">
              <View className="flex-row items-center justify-center">
                <ArrowDownRight size={18} color="#10b981" />
                <Text className="text-sm font-medium text-gray-600 ml-1">Income</Text>
              </View>
              <Text className="text-lg font-bold text-green-600 mt-1">
                {formatAmount(totalInflow)}
              </Text>
            </View>
            
            <View className="flex-1 items-center">
              <View className="flex-row items-center justify-center">
                <ArrowUpRight size={18} color="#ef4444" />
                <Text className="text-sm font-medium text-gray-600 ml-1">Expenses</Text>
              </View>
              <Text className="text-lg font-bold text-red-600 mt-1">
                {formatAmount(totalOutflow)}
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions by Bank */}
        {Object.entries(transactionsByBank).map(([bankName, bankTransactions]) => (
          <View key={bankName} className="mb-5">
            <View className="flex-row items-center mb-2">
              <View className="h-5 w-1.5 bg-gray-800 rounded mr-2" />
              <Text className="text-base font-bold text-gray-800">
                {bankName}
              </Text>
            </View>
            
            {(bankTransactions as TransactionStream[]).map((transaction: TransactionStream, index: number) => (
              <View 
                key={`${bankName}-${index}`} 
                className={`mb-3 bg-white rounded-lg shadow-sm overflow-hidden border-l-4 ${
                  transaction.type === 'inflow' ? 'border-green-500' : 'border-red-500'
                }`}
              >
                {/* Transaction Header */}
                <View className="flex-row justify-between items-center p-3 bg-gray-50">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-800">
                      {transaction.merchant_name || transaction.description}
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-gray-500 mt-0.5">
                      {transaction.category.join(' › ')}
                    </Text>
                  </View>
                  
                  <View className="flex-row items-center">
                    <StatusBadge status={transaction.status} />
                    <Text 
                      className={`ml-2 text-sm font-bold ${
                        transaction.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'inflow' ? '+' : '-'} {formatAmount(transaction.average_amount.amount)}
                    </Text>
                  </View>
                </View>
                
                {/* Transaction Details */}
                <View className="p-3 flex-row flex-wrap">
                  <View className="w-1/2 flex-row items-center mb-2">
                    <CalendarIcon size={14} color="#6b7280" />
                    <View className="ml-2">
                      <Text className="text-xs text-gray-500">Next Expected</Text>
                      <Text className="text-xs font-medium text-gray-800">
                        {format(parseISO(transaction.predicted_next_date), 'MMM d, yyyy')}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="w-1/2 flex-row items-center mb-2">
                    <Clock size={14} color="#6b7280" />
                    <View className="ml-2">
                      <Text className="text-xs text-gray-500">Frequency</Text>
                      <Text className="text-xs font-medium text-gray-800">
                        {transaction.frequency.charAt(0).toUpperCase() + transaction.frequency.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="w-1/2 flex-row items-center">
                    <Tag size={14} color="#6b7280" />
                    <View className="ml-2">
                      <Text className="text-xs text-gray-500">Category</Text>
                      <Text className="text-xs font-medium text-gray-800" numberOfLines={1}>
                        {transaction.category.slice(-1)[0]}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="w-1/2 flex-row items-center">
                    <RefreshCw size={14} color="#6b7280" />
                    <View className="ml-2">
                      <Text className="text-xs text-gray-500">Status</Text>
                      <Text className="text-xs font-medium text-gray-800">
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default DayDetailView; 