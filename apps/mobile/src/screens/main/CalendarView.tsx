/// <reference types="nativewind/types" />
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  FlatList,
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
  addDays,
  isToday,
  isSameMonth,
  isAfter,
  isBefore,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, PlusCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
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
  institutionId?: string;
  institutionName?: string;
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

interface TransactionWithType extends TransactionStream {
  type: 'inflow' | 'outflow';
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
    backgroundColor: '#FFFFFF',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 12,
    color: '#777777',
    fontWeight: '500',
  },
  dayCell: {
    width: DAY_WIDTH,
    height: DAY_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#F5F5F5',
  },
  highlightedDay: {
    borderWidth: 1,
    borderColor: '#000000',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
    marginTop: 2,
  },
  dayText: {
    fontSize: 14,
    color: '#000000',
  },
  dayTextMuted: {
    color: '#BBBBBB',
  },
  transactionDotsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  inflowDot: {
    backgroundColor: '#333333',
  },
  outflowDot: {
    backgroundColor: '#555555',
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  previewHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  previewContent: {
    maxHeight: 300,
  },
  emptyPreview: {
    padding: 16,
    alignItems: 'center',
  },
  emptyPreviewText: {
    color: '#999999',
    fontSize: 14,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionItemLeft: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  transactionFrequency: {
    fontSize: 12,
    color: '#777777',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  inflowAmount: {
    color: '#333333',
  },
  outflowAmount: {
    color: '#555555',
  },
  transactionIcon: {
    marginRight: 8,
  },
  seeAllButton: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  seeAllText: {
    color: '#000000',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  refreshButtonText: {
    color: '#000000',
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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

  const erroredConnections = getErroredConnections();
  
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
  const selectedDayTransactions = useMemo(() => {
    return getTransactionsForDay(selectedDate);
  }, [selectedDate, getTransactionsForDay]);

  // Get upcoming transactions for the preview panel (next 7 days)
  const upcomingTransactions = useMemo(() => {
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
          
          // Check if the date is today or in the future
          return !isBefore(predictedDate, startOfMonth(currentDate));
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
  }, [transactions.data, currentDate]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDayPress = (day: Date) => {
    setSelectedDate(day);
    
    const dayTransactions = getTransactionsForDay(day);
    if (dayTransactions.length > 0) {
      // We don't navigate away anymore, just update the preview panel
      console.log(`[CalendarView] Selected date with ${dayTransactions.length} transactions`);
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

  // Format amount as currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Render transaction item for the preview panel
  const renderTransactionItem = ({ item }: { item: TransactionWithType }) => {
    const transactionDate = parseISO(item.predicted_next_date);
    
    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => handleViewAllTransactions(transactionDate)}
      >
        <View style={styles.transactionItemLeft}>
          <Text style={styles.transactionDate}>
            {format(transactionDate, 'MMM d, yyyy')}
          </Text>
          <Text style={styles.transactionTitle}>
            {item.merchant_name || item.description}
          </Text>
          <Text style={styles.transactionFrequency}>
            {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {item.type === 'inflow' ? (
            <ArrowDownRight 
              size={16} 
              color="#333333"
              style={styles.transactionIcon} 
            />
          ) : (
            <ArrowUpRight 
              size={16} 
              color="#555555"
              style={styles.transactionIcon} 
            />
          )}
          <Text 
            style={[
              styles.transactionAmount,
              item.type === 'inflow' ? styles.inflowAmount : styles.outflowAmount
            ]}
          >
            {formatAmount(item.average_amount.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render the calendar day cells
  const renderDays = () => {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((day, index) => {
          const dayTransactions = getTransactionsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          
          // Count inflow and outflow transactions
          const inflowCount = dayTransactions.filter(t => t.type === 'inflow').length;
          const outflowCount = dayTransactions.filter(t => t.type === 'outflow').length;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected && styles.selectedDay,
                isDayToday && styles.highlightedDay,
              ]}
              onPress={() => handleDayPress(day)}
            >
              <Text 
                style={[
                  styles.dayText,
                  !isCurrentMonth && styles.dayTextMuted
                ]}
              >
                {format(day, 'd')}
              </Text>
              
              {(inflowCount > 0 || outflowCount > 0) && (
                <View style={styles.transactionDotsContainer}>
                  {/* Render up to 3 dots to indicate transactions */}
                  {Array.from({ length: Math.min(inflowCount, 3) }).map((_, i) => (
                    <View key={`inflow-${i}`} style={[styles.transactionDot, styles.inflowDot]} />
                  ))}
                  {Array.from({ length: Math.min(outflowCount, 3) }).map((_, i) => (
                    <View key={`outflow-${i}`} style={[styles.transactionDot, styles.outflowDot]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render the preview panel
  const renderPreviewPanel = () => {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewHeaderText}>
            {selectedDayTransactions.length > 0 
              ? `${format(selectedDate, 'MMMM d, yyyy')} (${selectedDayTransactions.length})` 
              : 'Upcoming Transactions'}
          </Text>
        </View>
        
        {transactions.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#000000" />
          </View>
        ) : selectedDayTransactions.length > 0 ? (
          <>
            <ScrollView style={styles.previewContent} nestedScrollEnabled={true}>
              {selectedDayTransactions.map((item, index) => (
                <View key={`${item.description}-${index}`}>
                  {renderTransactionItem({ item })}
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => handleViewAllTransactions(selectedDate)}
            >
              <Text style={styles.seeAllText}>See All Details</Text>
            </TouchableOpacity>
          </>
        ) : upcomingTransactions.length > 0 ? (
          <>
            <ScrollView style={styles.previewContent} nestedScrollEnabled={true}>
              {upcomingTransactions.slice(0, 5).map((item, index) => (
                <View key={`${item.description}-${index}`}>
                  {renderTransactionItem({ item })}
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => {
                if (upcomingTransactions.length > 0) {
                  const nextTransaction = upcomingTransactions[0];
                  const nextDate = parseISO(nextTransaction.predicted_next_date);
                  handleViewAllTransactions(nextDate);
                }
              }}
            >
              <Text style={styles.seeAllText}>View All Upcoming</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyPreviewText}>No transactions to display</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 80 }}
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
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={index} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {renderDays()}

          {/* Overlay loading indicator */}
          {(isLoading || transactions.isLoading) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#000000" />
            </View>
          )}
        </View>

        {/* Preview Panel */}
        {renderPreviewPanel()}

        {/* Just a simple refresh button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isLoading || transactions.isLoading}
        >
          <Text style={styles.refreshButtonText}>
            {isLoading || transactions.isLoading ? "Loading..." : "Refresh"}
          </Text>
        </TouchableOpacity>
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
