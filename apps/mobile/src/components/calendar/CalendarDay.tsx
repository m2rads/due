/// <reference types="nativewind/types" />

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CalendarDayProps } from '../../types/calendar';

// Calculate a consistent cell size for better layout
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 64) / 7); // Account for padding and margins

const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  inflowCount,
  outflowCount,
  onPress
}) => {
  // Format day number (1-31)
  const dayNumber = day.getDate();

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        isSelected && styles.selectedDay,
        isToday && styles.todayDay
      ]}
      className="justify-center items-center my-1 rounded-lg"
      onPress={() => onPress(day)}
    >
      <Text
        className={`text-sm ${!isCurrentMonth ? 'text-gray-300' : 'text-black'}`}
      >
        {dayNumber}
      </Text>
      
      {(inflowCount > 0 || outflowCount > 0) && (
        <View className="flex-row mt-1 h-1.5 items-center justify-center">
          {/* Render up to 3 dots to indicate transactions */}
          {Array.from({ length: Math.min(inflowCount, 3) }).map((_, i) => (
            <View 
              key={`inflow-${i}`} 
              className="w-1 h-1 rounded-full bg-gray-800 mx-0.5" 
            />
          ))}
          {Array.from({ length: Math.min(outflowCount, 3) }).map((_, i) => (
            <View 
              key={`outflow-${i}`} 
              className="w-1 h-1 rounded-full bg-gray-500 mx-0.5" 
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 1,
    alignSelf: 'center',
  },
  selectedDay: {
    backgroundColor: '#F5F5F5',
  },
  todayDay: {
    borderWidth: 1,
    borderColor: '#000000',
  }
});

export default CalendarDay; 