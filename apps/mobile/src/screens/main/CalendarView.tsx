/// <reference types="nativewind/types" />
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
  lastDayOfMonth,
  getDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, PlusCircle } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/auth';
import { plaidService } from '../../services/plaidService';
import { useBankConnections } from '../../hooks/useBankConnections';
import ConnectionStatusBanner from '../../components/ConnectionStatusBanner';
import ConnectionErrorModal from '../../components/ConnectionErrorModal';
import Toast from 'react-native-toast-message';
import { BankConnection } from '@due/types';
import Svg, { Path } from 'react-native-svg';

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

interface TransactionState {
  data: RecurringTransactions | null;
  isLoading: boolean;
  error: string | null;
}

interface RouteParams {
  transactions?: RecurringTransactions;
  freshlyLinked?: boolean;
  unlinked?: boolean;
  timestamp?: number;
}

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTAINER_WIDTH = SCREEN_WIDTH - 32; // Container width with padding
const CALENDAR_PADDING = 16; // Reduced padding for even spacing
const DAY_WIDTH = Math.floor((CONTAINER_WIDTH - (CALENDAR_PADDING * 2)) / 7); // Account for padding on both sides
const TOTAL_CALENDAR_WIDTH = DAY_WIDTH * 7;
const TRANSACTION_DEBOUNCE = 3000; // 3 second debounce between transaction loads
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 1000;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7F3', // Warm paper-like background
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 14,
    color: '#666666',
  },
  dayCell: {
    width: DAY_WIDTH,
    height: DAY_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#F0F0F0',
    borderColor: '#000000',
    borderWidth: 2,
  },
  dayText: {
    fontSize: 16,
    color: '#000000',
  },
  transactionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
    marginTop: 2,
  },
});

// Sketch-like arrow component
const SketchArrow = ({ direction }: { direction: 'left' | 'right' }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path
      d={
        direction === 'left'
          ? 'M15 6l-6 6 6 6'
          : 'M9 6l6 6-6 6'
      }
      stroke="#000"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const CalendarView = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams | undefined;
  
  // Debug renders with a counter
  const renderCountRef = useRef(0);
  
  // Log every render for debugging
  console.log(`[CalendarView] Rendering (${++renderCountRef.current})`);
  
  const [selectedConnection, setSelectedConnection] = useState<BankConnection | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const [isLoading, setIsLoading] = useState(false);
  
  // Add a ref to track navigation params to prevent repeated effect executions
  const paramsRef = useRef({
    processed: false,
    timestamp: params?.timestamp || 0
  });
  
  const [transactions, setTransactions] = useState<TransactionState>({
    data: params?.transactions || null,
    isLoading: false,
    error: null
  });

  const { 
    connections,
    isRefreshing,
    hasActiveConnections,
    getErroredConnections,
    refreshConnections
  } = useBankConnections();

  // Load transactions only when explicitly requested
  const loadTransactions = useCallback(async (forceRefresh = false) => {
    if (isLoading) {
      console.log('[CalendarView] Already loading transactions, skipping');
      return;
    }

    // Double check for active connections - this prevents unnecessary API calls
    // especially after unlinking an account
    if (!hasActiveConnections()) {
      console.log('[CalendarView] No active connections, setting empty transactions');
      setTransactions({
        data: { inflow_streams: [], outflow_streams: [] },
        isLoading: false,
        error: null
      });
      return;
    }

    try {
      console.log(`[CalendarView] Loading transactions... (forceRefresh: ${forceRefresh})`);
      setIsLoading(true);
      setTransactions(prev => ({ ...prev, isLoading: true }));

      // Pass forceRefresh parameter to the service call
      const response = await plaidService.getRecurringTransactions(forceRefresh);
      
      if (!response || !Array.isArray(response) || response.length === 0) {
        console.log('[CalendarView] Empty response from getRecurringTransactions');
        setTransactions({
          data: { inflow_streams: [], outflow_streams: [] },
          isLoading: false,
          error: null
        });
        return;
      }
      
      const data = response[0];
      console.log('[CalendarView] Loaded transactions successfully',
        `${data?.inflow_streams?.length || 0} inflows, ${data?.outflow_streams?.length || 0} outflows`);
      
      setTransactions({
        data,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('[CalendarView] Error loading transactions:', error);
      
      // Only show error toast for unexpected errors
      // Prevent showing error toasts for expected scenarios (like right after unlinking)
      const is400Error = error.response?.status === 400;
      
      if (!is400Error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load transactions'
        });
      } else {
        console.log('[CalendarView] Received 400 error, likely after unlinking account');
      }
      
      // Set empty data on 400 errors - typically means no active connections
      // or backend is in an invalid state after account changes
      if (is400Error) {
        setTransactions({
          data: { inflow_streams: [], outflow_streams: [] },
          isLoading: false,
          error: null
        });
      } else {
        // For other errors, keep existing data but mark error
        setTransactions(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load transactions'
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasActiveConnections, isLoading]);

  // Use this instead of multiple useEffects to handle focus events better
  useFocusEffect(
    useCallback(() => {
      console.log('[CalendarView] Screen focused');
      
      // Track any timeouts we create so we can clean them up
      const timeoutRefs: NodeJS.Timeout[] = [];
      
      // Process navigation params only once when screen is focused
      if (params && 
          (params.freshlyLinked || params.unlinked || params.transactions) && 
          (!paramsRef.current.processed || paramsRef.current.timestamp !== params.timestamp)) {
        
        console.log('[CalendarView] Processing navigation params on focus');
        
        // Mark as processed with current timestamp
        paramsRef.current = {
          processed: true,
          timestamp: params.timestamp || 0
        };
        
        // Process the params similarly to the previous useEffect
        if (params.transactions) {
          console.log('[CalendarView] Using transactions from params');
          setTransactions({
            data: params.transactions,
            isLoading: false,
            error: null
          });
        } else if (params.freshlyLinked || params.unlinked) {
          if (params.unlinked) {
            console.log('[CalendarView] Account unlinked, setting empty state initially');
            // IMMEDIATELY set empty state to prevent error flash
            setTransactions({
              data: { inflow_streams: [], outflow_streams: [] },
              isLoading: false,
              error: null
            });
            
            // Then, with a longer delay, check connections and maybe reload
            const timeoutId = setTimeout(() => {
              console.log('[CalendarView] Checking connections after unlink delay');
              refreshConnections().then(() => {
                // Only try loading transactions if we definitely have active connections
                if (hasActiveConnections()) {
                  console.log('[CalendarView] Still have active connections after unlinking, loading transactions');
                  // Add another delay before loading transactions to ensure backend is ready
                  const loadTimeoutId = setTimeout(() => {
                    loadTransactions(true).catch(error => {
                      // Silently handle any errors - we already have empty state as fallback
                      console.log('[CalendarView] Ignoring post-unlink transaction load error:', error);
                    });
                  }, 1000);
                  timeoutRefs.push(loadTimeoutId);
                } else {
                  console.log('[CalendarView] No active connections after unlinking, keeping empty state');
                }
              }).catch(error => {
                // Also silently handle connection refresh errors
                console.log('[CalendarView] Ignoring post-unlink connection refresh error:', error);
              });
            }, 1500); // Increased delay after unlinking
            
            timeoutRefs.push(timeoutId);
          } else if (params.freshlyLinked) {
            console.log('[CalendarView] Freshly linked account detected, loading with longer delay');
            
            // Show loading state immediately
            setTransactions(prev => ({ ...prev, isLoading: true }));
            
            // For newly linked accounts, use a longer delay
            // The backend needs more time to process the new account
            const timeoutId = setTimeout(() => {
              // Load transactions with force refresh to bypass cache
              loadTransactions(true).catch(error => {
                console.error('[CalendarView] Error loading transactions after linking:', error);
                
                // Even on error, still show empty state rather than error
                setTransactions({
                  data: { inflow_streams: [], outflow_streams: [] },
                  isLoading: false,
                  error: null
                });
              });
            }, 800); // Longer delay for freshly linked accounts
            
            timeoutRefs.push(timeoutId);
          }
        }
      }
      
      // Cleanup function for when screen loses focus
      return () => {
        console.log('[CalendarView] Screen unfocused - cleaning up');
        
        // Clear any timeouts we created
        timeoutRefs.forEach(id => clearTimeout(id));
      };
    }, [params, hasActiveConnections, loadTransactions, refreshConnections])
  );

  // Replace the previous useEffect with this simplified one that only runs once on mount
  useEffect(() => {
    console.log('[CalendarView] Component mounted');
    
    // Only load on first mount if no params were provided
    if (!params?.transactions && !params?.freshlyLinked && !params?.unlinked) {
      console.log('[CalendarView] Initial load on mount');
      
      if (hasActiveConnections()) {
        loadTransactions();
      } else {
        console.log('[CalendarView] No active connections on mount');
        setTransactions({
          data: { inflow_streams: [], outflow_streams: [] },
          isLoading: false,
          error: null
        });
      }
    }
    
    return () => {
      console.log('[CalendarView] Component unmounted');
    };
  }, []); // Empty dependency array - only run once on mount

  const handleRefresh = useCallback(async () => {
    console.log('[CalendarView] Manual refresh initiated');
    try {
      await refreshConnections();
      // Use forceRefresh=true to bypass cache
      await loadTransactions(true);
      Toast.show({
        type: 'success',
        text1: 'Data Refreshed'
      });
    } catch (error) {
      console.error('[CalendarView] Error during refresh:', error);
    }
  }, [refreshConnections, loadTransactions]);

  const handleReconnect = async (connection: BankConnection) => {
    console.log('[CalendarView] Setting selected connection for reconnect:', connection.id);
    setSelectedConnection(connection);
  };

  const handleReconnectConfirm = () => {
    setIsReconnecting(false);
    // Navigate to the AddAccount screen
    navigation.navigate('AddAccount');
  };

  const erroredConnections = getErroredConnections();
  
  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  // Add the function after the component useMemo hooks but before the handlers
  const getDayTransactions = (day: Date, monthTransactions: RecurringTransactions) => {
    const formattedDay = format(day, 'yyyy-MM-dd');
    
    const inflows = monthTransactions.inflow_streams || [];
    const outflows = monthTransactions.outflow_streams || [];
    
    const allTransactions = [
      ...inflows.map(t => ({ ...t, type: 'inflow' as const })),
      ...outflows.map(t => ({ ...t, type: 'outflow' as const }))
    ];
    
    return allTransactions.filter(transaction => {
      const transactionDate = parseISO(transaction.predicted_next_date);
      return format(transactionDate, 'yyyy-MM-dd') === formattedDay;
    });
  };

  const getTransactionsForDay = (day: Date) => {
    if (!transactions.data) return [];
    
    const inflows = transactions.data.inflow_streams || [];
    const outflows = transactions.data.outflow_streams || [];
    
    const allTransactions = [
      ...inflows.map(t => ({ ...t, type: 'inflow' as const })),
      ...outflows.map(t => ({ ...t, type: 'outflow' as const }))
    ];

    return allTransactions.filter(transaction => {
      try {
        // Skip if no predicted date
        if (!transaction.predicted_next_date) return false;
        
        // Parse the date safely
        let predictedDate;
        try {
          predictedDate = parseISO(transaction.predicted_next_date);
          // Check if valid date
          if (isNaN(predictedDate.getTime())) return false;
        } catch (e) {
          console.error('[CalendarView] Invalid date format:', transaction.predicted_next_date);
          return false;
        }
        
        return isSameDay(predictedDate, day);
      } catch (e) {
        console.error('[CalendarView] Error comparing dates:', e);
        return false;
      }
    });
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDayPress = (day: Date) => {
    const dayTransactions = getTransactionsForDay(day);
    if (dayTransactions.length > 0) {
      navigation.navigate('DayDetail', {
        date: day.toISOString(),
        transactions: dayTransactions
      });
    }
  };

  // Calculate first day offset
  const firstDayOffset = getDay(startOfMonth(currentDate));

  // Loading view for transactions loading
  const LoadingView = useCallback(() => {
    if (!transactions.isLoading) {
      return null;
    }
    
    return (
      <View 
        style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          alignItems: 'center',
          zIndex: 10
        }}
      >
        <Text style={{ fontSize: 12, color: '#888888' }}>Loading transactions...</Text>
      </View>
    );
  }, [transactions.isLoading]);

  return (
    <ScrollView 
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {/* Only show error banner when we have genuine errored connections */}
      {erroredConnections.length > 0 && (
        <ConnectionStatusBanner
          erroredConnections={erroredConnections}
          onReconnect={handleReconnect}
        />
      )}

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={prevMonth} className="p-2">
            <SketchArrow direction="left" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {format(currentDate, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-2">
            <SketchArrow direction="right" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.weekdayText}>
              {day}
            </Text>
          ))}
        </View>

        <View className="flex-row flex-wrap relative">
          {Array.from({ length: firstDayOffset }).map((_, index) => (
            <View
              key={`empty-${index}`}
              style={[styles.dayCell, { borderColor: 'transparent' }]}
            />
          ))}

          {days.map((day) => {
            const dayTransactions = getTransactionsForDay(day);
            const isToday = isSameDay(day, today);

            return (
              <TouchableOpacity
                key={day.toString()}
                style={[
                  styles.dayCell,
                  isToday && styles.selectedDay,
                ]}
                onPress={() => handleDayPress(day)}
                disabled={dayTransactions.length === 0}
              >
                <Text style={styles.dayText}>
                  {format(day, 'd')}
                </Text>
                {dayTransactions.length > 0 && (
                  <View style={styles.transactionDot} />
                )}
              </TouchableOpacity>
            );
          })}

          {Array.from({ length: (7 - ((days.length + firstDayOffset) % 7)) % 7 }).map((_, index) => (
            <View
              key={`empty-end-${index}`}
              style={[styles.dayCell, { borderColor: 'transparent' }]}
            />
          ))}

          <LoadingView />
        </View>
      </View>

      {/* Just a simple refresh button */}
      <View className="items-center mt-6">
        <TouchableOpacity
          className="bg-gray-200 py-3 px-6 rounded-lg flex-row items-center border border-gray-400"
          onPress={handleRefresh}
          disabled={isLoading || transactions.isLoading}
        >
          <Text className="text-gray-700 font-medium">
            {isLoading || transactions.isLoading ? "Loading..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error modal for handling reconnection */}
      <ConnectionErrorModal
        visible={!!selectedConnection}
        connection={selectedConnection}
        isReconnecting={isReconnecting}
        onReconnect={handleReconnectConfirm}
        onClose={() => setSelectedConnection(null)}
      />
    </ScrollView>
  );
};

export default CalendarView;
