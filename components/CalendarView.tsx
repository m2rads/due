/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
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
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

const sampleLogos = [
  "https://companieslogo.com/img/orig/AMZN-e9f942e4.png",
  "https://companieslogo.com/img/orig/GOOGL-0ed88f7c.png",
  "https://companieslogo.com/img/orig/NFLX-a4700c1d.png",
  "https://companieslogo.com/img/orig/AAPL-bf1a4314.png",
  "https://companieslogo.com/img/orig/IBM-57ec8a40.png",
  "https://companieslogo.com/img/orig/MSFT-a203b22c.png",
];

const getRandomLogos = () => {
  const count = Math.floor(Math.random() * 4);
  const shuffled = [...sampleLogos].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = (SCREEN_WIDTH - 32) / 7; // 32 is total horizontal padding

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

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
            const dayLogos = getRandomLogos();
            const visibleLogos = dayLogos.slice(0, 2);
            const hasMoreLogos = dayLogos.length > 2;

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
                  {hasMoreLogos && (
                    <View className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </View>
                
                <View className="flex-1 pt-6 px-0.5 justify-center items-center">
                  <View className="flex-row flex-wrap justify-center items-center gap-0.5">
                    {visibleLogos.map((logo, idx) => (
                      <View 
                        key={idx} 
                        className="w-5 h-5 bg-white rounded-full p-0.5 shadow-sm overflow-hidden"
                      >
                        <Image
                          source={{ uri: logo }}
                          className="w-full h-full"
                          resizeMode="contain"
                        />
                      </View>
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
