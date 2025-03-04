/// <reference types="nativewind/types" />
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/auth';
import { parseISO } from 'date-fns';
import { addMonths, subMonths, isSameDay } from 'date-fns';
import { plaidService } from '../../services/plaidService';
import { useBankConnections } from '../../hooks/useBankConnections';
import ConnectionStatusBanner from '../../components/ConnectionStatusBanner';
import ConnectionErrorModal from '../../components/ConnectionErrorModal';
import Toast from 'react-native-toast-message';
import { BankConnection } from '@due/types';
import { ChevronLeft } from 'lucide-react-native';

// Import custom components
import Calendar from '../../components/calendar/Calendar';
import TransactionPreview from '../../components/calendar/TransactionPreview';

// Import types from separate file
import { 
  TransactionState, 
  RouteParams,
  TransactionWithType,
  RecurringTransactions
} from '../../types/calendar';

// Constants
const TRANSACTION_DEBOUNCE = 3000; // 3 second debounce between transaction loads
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 1000;

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

// Custom header component
const Header = ({ title, showBack = false }: { title: string, showBack?: boolean }) => {
  const navigation = useNavigation();
  
  return (
    <View className="bg-white px-4 pt-16 pb-4 flex-row items-center">
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

const CalendarView = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams | undefined;
  const isInTab = route.name === 'Calendar';
  
  // Debug renders with a counter
  const renderCountRef = useRef(0);
  
  // Log every render for debugging
  console.log(`[CalendarView] Rendering (${++renderCountRef.current})`);
  
  const [selectedConnection, setSelectedConnection] = useState<BankConnection | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
      
      // Combine transactions from all bank accounts instead of just the first one
      const combinedData: RecurringTransactions = {
        inflow_streams: [],
        outflow_streams: []
      };
      
      // Merge all transaction data from all bank connections
      response.forEach((accountData: RecurringTransactions) => {
        if (accountData?.inflow_streams?.length) {
          combinedData.inflow_streams.push(...accountData.inflow_streams);
        }
        if (accountData?.outflow_streams?.length) {
          combinedData.outflow_streams.push(...accountData.outflow_streams);
        }
      });
      
      console.log('[CalendarView] Loaded transactions successfully',
        `${combinedData.inflow_streams.length} inflows, ${combinedData.outflow_streams.length} outflows`,
        `from ${response.length} bank connections`);
      
      setTransactions({
        data: combinedData,
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

  // Get transactions for a specific day
  const getTransactionsForDay = useCallback((day: Date) => {
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
  }, [transactions.data]);

  // Get transactions for the selected day
  const selectedDayTransactions = useCallback(() => {
    return getTransactionsForDay(selectedDate);
  }, [selectedDate, getTransactionsForDay]);

  // Get upcoming transactions for the preview panel (next 7 days)
  const upcomingTransactions = useCallback(() => {
    if (!transactions.data) return [];
    
    const inflows = transactions.data.inflow_streams || [];
    const outflows = transactions.data.outflow_streams || [];
    
    const allTransactions = [
      ...inflows.map(t => ({ ...t, type: 'inflow' as const })),
      ...outflows.map(t => ({ ...t, type: 'outflow' as const }))
    ];

    // Filter and sort transactions by date
    const upcoming = allTransactions
      .filter(transaction => {
        try {
          if (!transaction.predicted_next_date) return false;
          
          const predictedDate = parseISO(transaction.predicted_next_date);
          if (isNaN(predictedDate.getTime())) return false;
          
          // Check if the date is in the current month or future
          return true;
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        const dateA = parseISO(a.predicted_next_date);
        const dateB = parseISO(b.predicted_next_date);
        return dateA.getTime() - dateB.getTime();
      });
    
    return upcoming;
  }, [transactions.data]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDayPress = (day: Date) => {
    setSelectedDate(day);
    const dayTransactions = getTransactionsForDay(day);
    if (dayTransactions.length > 0) {
      // Get unique banks represented in these transactions
      const uniqueBanks = new Set(dayTransactions.map(t => t.institutionId).filter(Boolean));
      const uniqueBankCount = uniqueBanks.size;
      const uniqueBankNames = new Set(dayTransactions.map(t => t.institutionName).filter(Boolean));
      
      console.log(`[CalendarView] Navigating to DayDetail with ${dayTransactions.length} transactions from ${uniqueBankCount} banks (${uniqueBankNames})`);
      
      navigation.navigate('DayDetail', {
        date: day.toISOString(),
        transactions: dayTransactions
      });
    }
  };

  const handleViewAllTransactions = (day: Date) => {
    const dayTransactions = getTransactionsForDay(day);
    if (dayTransactions.length > 0) {
      // Count the number of unique banks
      const uniqueBanks = dayTransactions.reduce((banks, tx) => {
        const bankName = tx.institutionName || 'Unknown Bank';
        banks[bankName] = true;
        return banks;
      }, {} as Record<string, boolean>);
      
      const uniqueBankCount = Object.keys(uniqueBanks).length;
      const uniqueBankNames = Object.keys(uniqueBanks).join(', ');
      
      console.log(`[CalendarView] Navigating to DayDetail with ${dayTransactions.length} transactions from ${uniqueBankCount} banks (${uniqueBankNames})`);
      
      navigation.navigate('DayDetail', {
        date: day.toISOString(),
        transactions: dayTransactions
      });
    }
  };

  const erroredConnections = getErroredConnections();

  return (
    <View className="flex-1 bg-white">
      <Header title="Calendar" showBack={!isInTab} />
      
      <ScrollView 
        className="pb-20"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Only show error banner when we have genuine errored connections */}
        {erroredConnections.length > 0 && (
          <ConnectionStatusBanner
            erroredConnections={erroredConnections}
            onReconnect={handleReconnect}
          />
        )}

        {/* Calendar Component */}
        <Calendar 
          currentDate={currentDate}
          selectedDate={selectedDate}
          getTransactionsForDay={getTransactionsForDay}
          onDateSelect={handleDayPress}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          isLoading={false}
        />

        {/* Transaction Preview Component */}
        <TransactionPreview 
          selectedDate={selectedDate}
          selectedDayTransactions={selectedDayTransactions()}
          upcomingTransactions={upcomingTransactions()}
          isLoading={isLoading || transactions.isLoading}
          onViewAllTransactions={handleViewAllTransactions}
        />

        {/* Refresh Button */}
        {/* <TouchableOpacity
          className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 items-center justify-center mt-4 mb-4 self-center"
          onPress={handleRefresh}
          disabled={isLoading || transactions.isLoading}
        >
          <Text className="text-black font-medium">
            {isLoading || transactions.isLoading ? "Loading..." : "Refresh"}
          </Text>
        </TouchableOpacity> */}
      </ScrollView>

      {/* Error modal for handling reconnection */}
      <ConnectionErrorModal
        visible={!!selectedConnection}
        connection={selectedConnection}
        isReconnecting={isReconnecting}
        onReconnect={handleReconnectConfirm}
        onClose={() => setSelectedConnection(null)}
      />
    </View>
  );
};

export default CalendarView;
