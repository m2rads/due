/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

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
}

interface RecurringTransactions {
  inflow_streams: TransactionStream[];
  outflow_streams: TransactionStream[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = (SCREEN_WIDTH - 32) / 7; // 32 is total horizontal padding

const CalendarView = ({ route }: any) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const transactions = route.params?.transactions as RecurringTransactions;

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getTransactionsForDay = (day: Date) => {
    if (!transactions) return [];
    
    const allTransactions = [
      ...transactions.inflow_streams.map(t => ({ ...t, type: 'inflow' as const })),
      ...transactions.outflow_streams.map(t => ({ ...t, type: 'outflow' as const }))
    ];

    return allTransactions.filter(transaction => {
      const predictedDate = parseISO(transaction.predicted_next_date);
      return isSameDay(predictedDate, day);
    });
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <View className="flex-1 bg-gray-100 p-4">
      <View className="bg-white rounded-xl shadow-sm">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
          <TouchableOpacity onPress={prevMonth} className="p-2">
            <ChevronLeft size={24} color="#666" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-800">
            {format(currentDate, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-2">
            <ChevronRight size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View className="flex-row p-4 pb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} className="flex-1 text-center text-sm font-medium text-gray-600">
              {day}
            </Text>
          ))}
        </View>

        <View className="flex-row flex-wrap p-4 pt-2">
          {Array.from({ length: getFirstDayOffset(currentDate) }).map((_, index) => (
            <View 
              key={`empty-${index}`} 
              style={{ width: DAY_WIDTH }}
              className="aspect-square p-1 border border-gray-100 rounded-lg"
            />
          ))}
          
          {days.map((day) => {
            const dayTransactions = getTransactionsForDay(day);
            const visibleTransactions = dayTransactions.slice(0, 2);
            const hasMoreTransactions = dayTransactions.length > 2;

            return (
              <View
                key={day.toString()}
                style={{ width: DAY_WIDTH }}
                className={`aspect-square relative border border-gray-100 rounded-lg ${
                  isSameDay(day, today) ? 'bg-blue-50 border-blue-500' : ''
                }`}
              >
                <View className="absolute top-1 left-1 right-1 flex-row justify-between items-center">
                  <Text className="text-xs text-gray-600">
                    {format(day, 'd')}
                  </Text>
                  {hasMoreTransactions && (
                    <View className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </View>
                
                <View className="flex-1 pt-6 px-0.5 justify-center items-center">
                  <View className="flex-row flex-wrap justify-center items-center gap-0.5">
                    {visibleTransactions.map((transaction, idx) => (
                      <Text 
                        key={idx}
                        className={`text-xs ${
                          transaction.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                        }`}
                        numberOfLines={1}
                      >
                        {transaction.merchant_name || transaction.description}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

function getFirstDayOffset(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

export default CalendarView;
