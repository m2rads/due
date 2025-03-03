/// <reference types="nativewind/types" />

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { CalendarProps } from '../../types/calendar';
import CalendarDay from './CalendarDay';
import SketchArrow from './SketchArrow';

const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  selectedDate,
  getTransactionsForDay,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
  isLoading = false
}) => {
  // Get the days for the calendar
  const days = useMemo(() => {
    // Get all days in the current month
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
    
    // Add days from previous month to fill the first week
    const firstDay = startOfMonth(currentDate);
    const firstDayOfWeek = getDay(firstDay);
    
    const previousMonthDays = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      previousMonthDays.unshift(addDays(firstDay, -i - 1));
    }
    
    // Add days from next month to fill the last week
    const lastDay = endOfMonth(currentDate);
    const lastDayOfWeek = getDay(lastDay);
    
    const nextMonthDays = [];
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      nextMonthDays.push(addDays(lastDay, i));
    }
    
    return [...previousMonthDays.reverse(), ...daysInMonth, ...nextMonthDays];
  }, [currentDate]);

  // Organize days into weeks for a grid layout
  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    const weekCount = Math.ceil(days.length / 7);
    
    for (let i = 0; i < weekCount; i++) {
      weeks.push(days.slice(i * 7, (i + 1) * 7));
    }
    
    return weeks;
  }, [days]);

  return (
    <View className="bg-white rounded-xl m-4 p-4 border border-gray-200 shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity onPress={onPrevMonth} className="p-2">
          <SketchArrow direction="left" />
        </TouchableOpacity>
        <Text className="text-xl font-semibold text-black">
          {format(currentDate, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={onNextMonth} className="p-2">
          <SketchArrow direction="right" />
        </TouchableOpacity>
      </View>

      <View className="mb-2">
        {/* Day names row with precise alignment */}
        <View className="flex-row">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <View key={index} className="flex-1 items-center">
              <Text className="text-xs text-gray-500 font-medium">
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid with weeks and days */}
        {calendarWeeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} className="flex-row">
            {week.map((day, dayIndex) => {
              const dayTransactions = getTransactionsForDay(day);
              const isCurrentMonthDay = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);
              const isDaySelected = isSameDay(day, selectedDate);
              
              // Count inflow and outflow transactions
              const inflowCount = dayTransactions.filter(t => t.type === 'inflow').length;
              const outflowCount = dayTransactions.filter(t => t.type === 'outflow').length;
              
              return (
                <View key={`day-${dayIndex}`} className="flex-1">
                  <CalendarDay
                    day={day}
                    isCurrentMonth={isCurrentMonthDay}
                    isToday={isDayToday}
                    isSelected={isDaySelected}
                    inflowCount={inflowCount}
                    outflowCount={outflowCount}
                    onPress={onDateSelect}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

export default Calendar; 