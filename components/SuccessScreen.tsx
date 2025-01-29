import React, {useState, useEffect, useCallback} from 'react';
import {
  Text,
  View,
  ToastAndroid,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

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

const TransactionCard = ({ transaction, type }: { transaction: TransactionStream, type: 'inflow' | 'outflow' }) => {
  const amount = Math.abs(transaction.average_amount.amount);
  const formattedAmount = amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#2d3436',
          flex: 1,
        }}>
          {transaction.merchant_name || transaction.description}
        </Text>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          marginLeft: 8,
          color: type === 'inflow' ? '#2ecc71' : '#e74c3c',
        }}>
          {type === 'inflow' ? '+' : '-'}{formattedAmount}
        </Text>
      </View>
      
      <View style={{ gap: 4 }}>
        <Text style={{
          fontSize: 14,
          color: '#636e72',
          marginBottom: 4,
        }}>
          {transaction.category.join(' › ')}
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#636e72',
          fontWeight: '500',
        }}>
          {transaction.frequency.charAt(0) + transaction.frequency.slice(1).toLowerCase()} • {transaction.status}
        </Text>
        <Text style={{
          fontSize: 13,
          color: '#b2bec3',
        }}>
          Last transaction: {new Date(transaction.last_date).toLocaleDateString()}
        </Text>
        <Text style={{
          fontSize: 13,
          color: '#b2bec3',
        }}>
          Next predicted: {new Date(transaction.predicted_next_date).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};

const SuccessScreen = ({ navigation, route }: any) => {
  const [transactions, setTransactions] = useState<RecurringTransactions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const address = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';

  // Fetch recurring transactions data
  const getRecurringTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`http://${address}:8080/api/recurring_transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.recurring_transactions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      console.error('Error fetching recurring transactions:', err);
      setError(errorMessage);
      notifyMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    getRecurringTransactions();
  }, [getRecurringTransactions]);

  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
      }}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={{
          marginTop: 10,
          fontSize: 16,
          color: '#2d3436',
        }}>Loading transactions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
      }}>
        <Text style={{
          fontSize: 16,
          color: '#e74c3c',
          textAlign: 'center',
          paddingHorizontal: 20,
        }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f6fa' }}>
      <View style={{
        backgroundColor: 'white',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
      }}>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#2d3436',
        }}>
          Recurring Transactions
        </Text>
      </View>
      <ScrollView style={{ flex: 1 }}>
        {transactions && (
          <View style={{ padding: 16 }}>
            {transactions.inflow_streams.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  marginBottom: 12,
                  color: '#2d3436',
                }}>
                  Income
                </Text>
                {transactions.inflow_streams.map((transaction, index) => (
                  <TransactionCard 
                    key={index} 
                    transaction={transaction} 
                    type="inflow" 
                  />
                ))}
              </View>
            )}
            
            {transactions.outflow_streams.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  marginBottom: 12,
                  color: '#2d3436',
                }}>
                  Expenses
                </Text>
                {transactions.outflow_streams.map((transaction, index) => (
                  <TransactionCard 
                    key={index} 
                    transaction={transaction} 
                    type="outflow" 
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

function notifyMessage(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('Error', msg);
  }
}

export default SuccessScreen;