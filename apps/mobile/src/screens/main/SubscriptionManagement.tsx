/// <reference types="nativewind/types" />
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert
} from 'react-native';
import { ArrowUpRight, Clock, Tag, Calendar as CalendarIcon, Sliders, Plus, Search, Edit2, Trash2, Filter, ChevronLeft } from 'lucide-react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/auth';
import { plaidService } from '../../services/plaidService';
import { useBankConnections } from '../../hooks/useBankConnections';
import Toast from 'react-native-toast-message';
import { format, parseISO } from 'date-fns';

// Types from existing transaction code
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

interface TransactionWithType extends TransactionStream {
  type: 'inflow' | 'outflow';
  id?: string; // We'll generate a temp ID for operations
}

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#000000',
  },
  searchContainer: {
    padding: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    flexDirection: 'row',
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchPlaceholder: {
    marginLeft: 8,
    fontSize: 14,
    color: '#888888',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  tabText: {
    fontSize: 14,
    color: '#888888',
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  summaryColumn: {
    flex: 1,
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  subscriptionsList: {
    paddingHorizontal: 16,
  },
  subscriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subscriptionContent: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  subscriptionCategory: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666666',
  },
  subscriptionPrice: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  frequencyText: {
    fontSize: 12,
    color: '#888888',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    padding: 6,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 16,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  filterOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  filterOptionText: {
    fontSize: 16,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  categoryFilterButton: {
    padding: 8,
    marginLeft: 12,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  applyButton: {
    color: '#000000',
  },
  resetButton: {
    color: '#888888',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});

// Custom header component
const Header = ({ title, showBack = false }: { title: string, showBack?: boolean }) => {
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

const SubscriptionManagement = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const isInTab = route.name === 'Subscriptions';
  const [activeTab, setActiveTab] = useState<'all' | 'outflow' | 'inflow'>('outflow'); // Default to outflow (subscriptions)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Transaction state management
  const [transactions, setTransactions] = useState<TransactionState>({
    data: null,
    isLoading: true,
    error: null
  });

  const { hasActiveConnections } = useBankConnections();

  // Load recurring transactions
  const loadTransactions = useCallback(async (forceRefresh = false) => {
    if (!hasActiveConnections()) {
      setTransactions({
        data: { inflow_streams: [], outflow_streams: [] },
        isLoading: false,
        error: null
      });
      return;
    }

    try {
      setTransactions(prev => ({ ...prev, isLoading: true }));
      
      const response = await plaidService.getRecurringTransactions(forceRefresh);
      
      if (!response || !Array.isArray(response) || response.length === 0) {
        setTransactions({
          data: { inflow_streams: [], outflow_streams: [] },
          isLoading: false,
          error: null
        });
        return;
      }
      
      // Combine transactions from all bank accounts
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
      
      setTransactions({
        data: combinedData,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading transactions:', error);
      
      setTransactions(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load transactions'
      }));
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load subscriptions'
      });
    }
  }, [hasActiveConnections]);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      
      return () => {
        // Cleanup if needed
      };
    }, [loadTransactions])
  );

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTransactions(true);
    setIsRefreshing(false);
    
    Toast.show({
      type: 'success',
      text1: 'Subscriptions updated'
    });
  }, [loadTransactions]);

  // Add new manual subscription
  const handleAddSubscription = () => {
    // This will be implemented when we create the subscription editor
    navigation.navigate('SubscriptionEditor', { mode: 'create' });
  };

  // Edit subscription
  const handleEditSubscription = (subscription: TransactionWithType) => {
    // This will be implemented when we create the subscription editor
    navigation.navigate('SubscriptionEditor', { 
      mode: 'edit',
      subscription 
    });
  };

  // Delete subscription confirmation
  const handleDeleteSubscription = (subscription: TransactionWithType) => {
    Alert.alert(
      'Delete Subscription',
      `Are you sure you want to delete the subscription for ${subscription.merchant_name || subscription.description}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implement actual deletion logic here
            Toast.show({
              type: 'success',
              text1: 'Subscription deleted'
            });
          }
        }
      ]
    );
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

  // Filter and prepare transactions based on active tab and search
  const filteredTransactions = React.useMemo(() => {
    if (!transactions.data) return [];
    
    const inflows = transactions.data.inflow_streams || [];
    const outflows = transactions.data.outflow_streams || [];
    
    let result: TransactionWithType[] = [];
    
    if (activeTab === 'all' || activeTab === 'inflow') {
      result = [...result, ...inflows.map((t, index) => ({ 
        ...t, 
        type: 'inflow' as const, 
        id: `inflow-${t.merchant_name}-${t.frequency}-${index}` 
      }))];
    }
    
    if (activeTab === 'all' || activeTab === 'outflow') {
      result = [...result, ...outflows.map((t, index) => ({ 
        ...t, 
        type: 'outflow' as const, 
        id: `outflow-${t.merchant_name}-${t.frequency}-${index}` 
      }))];
    }
    
    // Apply search filter if needed
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.merchant_name && item.merchant_name.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.category && item.category.some(cat => cat.toLowerCase().includes(query)))
      );
    }
    
    return result;
  }, [transactions.data, activeTab, searchQuery]);

  // Calculate summary totals
  const summaryData = React.useMemo(() => {
    if (!filteredTransactions.length) {
      return {
        totalCount: 0,
        totalAmount: 0,
        monthlyAmount: 0
      };
    }

    const totalAmount = filteredTransactions.reduce((sum, item) => 
      sum + item.average_amount.amount, 0);
    
    // Rough estimate of monthly amount (could be improved with actual frequency calculation)
    const monthlyAmount = filteredTransactions.reduce((sum, item) => {
      const frequency = item.frequency;
      const amount = item.average_amount.amount;
      
      // Multiply based on frequency to get monthly equivalent
      if (frequency === 'weekly') return sum + (amount * 4);
      if (frequency === 'biweekly') return sum + (amount * 2);
      if (frequency === 'monthly') return sum + amount;
      if (frequency === 'quarterly') return sum + (amount / 3);
      if (frequency === 'semiannually') return sum + (amount / 6);
      if (frequency === 'annually') return sum + (amount / 12);
      
      return sum + amount; // Default monthly
    }, 0);
    
    return {
      totalCount: filteredTransactions.length,
      totalAmount,
      monthlyAmount
    };
  }, [filteredTransactions]);

  // Render an individual subscription item
  const renderSubscriptionItem = ({ item }: { item: TransactionWithType }) => {
    return (
      <View style={styles.subscriptionItem}>
        <View style={styles.subscriptionContent}>
          <Text style={styles.subscriptionTitle}>
            {item.merchant_name || item.description}
          </Text>
          
          <Text style={styles.subscriptionCategory}>
            {item.category.slice(0, 2).join(' › ')}
          </Text>
          
          <View style={styles.detailRow}>
            <CalendarIcon size={12} color="#666666" style={styles.detailIcon} />
            <Text style={styles.detailText}>
              Next: {format(parseISO(item.predicted_next_date), 'MMM d, yyyy')}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Clock size={12} color="#666666" style={styles.detailIcon} />
            <Text style={styles.detailText}>
              {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
            </Text>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleEditSubscription(item)}
            >
              <Edit2 size={16} color="#888888" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleDeleteSubscription(item)}
            >
              <Trash2 size={16} color="#888888" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.subscriptionPrice}>
          <Text style={styles.priceText}>
            {formatAmount(item.average_amount.amount)}
          </Text>
          
          <Text style={styles.frequencyText}>
            per {item.frequency.replace('ly', '')}
          </Text>
        </View>
      </View>
    );
  };

  // Render empty state when no subscriptions are found
  const renderEmptyState = () => {
    if (transactions.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={{ marginTop: 12, color: '#888888' }}>
            Loading subscriptions...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery 
            ? "No subscriptions match your search" 
            : "No subscriptions found"}
        </Text>
        
        {!searchQuery && (
          <TouchableOpacity 
            onPress={handleAddSubscription}
            style={{ ...styles.categoryFilterButton, borderColor: '#000000' }}
          >
            <Text style={{ color: '#000000' }}>Add Manually</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Subscriptions" showBack={!isInTab} />
      
      {/* Search Container - keep this */}
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.searchInput}>
          <Search size={16} color="#888888" />
          <Text style={styles.searchPlaceholder}>Search subscriptions...</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'outflow' && styles.tabActive]}
          onPress={() => setActiveTab('outflow')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'outflow' && styles.tabTextActive
          ]}>
            Subscriptions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'inflow' && styles.tabActive]}
          onPress={() => setActiveTab('inflow')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'inflow' && styles.tabTextActive
          ]}>
            Income
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'all' && styles.tabTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id || `${item.type}-${item.merchant_name}-${item.predicted_next_date}`}
        renderItem={renderSubscriptionItem}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={filteredTransactions.length > 0 ? (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryColumn}>
              <Text style={styles.summaryAmount}>
                {summaryData.totalCount}
              </Text>
              <Text style={styles.summaryLabel}>
                Active {activeTab === 'inflow' ? 'Income' : activeTab === 'outflow' ? 'Subscriptions' : 'Transactions'}
              </Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryColumn}>
              <Text style={styles.summaryAmount}>
                {formatAmount(summaryData.monthlyAmount)}
              </Text>
              <Text style={styles.summaryLabel}>
                Monthly {activeTab === 'inflow' ? 'Income' : activeTab === 'outflow' ? 'Expenses' : 'Total'}
              </Text>
            </View>
          </View>
        ) : null}
        contentContainerStyle={styles.subscriptionsList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />
      
      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddSubscription}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

export default SubscriptionManagement; 