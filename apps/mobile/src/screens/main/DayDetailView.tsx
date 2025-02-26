/// <reference types="nativewind/types" />
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { format, parseISO } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, DollarSign, Clock, Tag, RefreshCw } from 'lucide-react-native';

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFF0', // Very light green background
  },
  windowContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderWidth: 1,
    borderColor: '#004400', // Dark green border
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#004400',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  windowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#88AA88', // Medium green header
    borderBottomWidth: 1,
    borderBottomColor: '#004400',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  windowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#004400', // Dark green text
    textAlign: 'center',
    flex: 1,
  },
  windowButtons: {
    flexDirection: 'row',
    position: 'absolute',
    left: 8,
  },
  closeButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF5F57',
    borderWidth: 1,
    borderColor: '#E33E32',
    marginRight: 6,
  },
  minimizeButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFBD2E',
    borderWidth: 1,
    borderColor: '#E09E1A',
    marginRight: 6,
  },
  expandButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#28CA42',
    borderWidth: 1,
    borderColor: '#17A62E',
  },
  dateContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#B0D2B0',
    alignItems: 'center',
    backgroundColor: '#E8F5E8', // Light green background
  },
  dateText: {
    fontSize: 14,
    color: '#004400', // Dark green text
    textAlign: 'center',
    fontWeight: '500',
  },
  summaryContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#B0D2B0',
    backgroundColor: '#FFFFFF',
  },
  summaryColumn: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#B0D2B0',
  },
  summaryColumnLast: {
    flex: 1,
    padding: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#004400', // Dark green text
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryAmountInflow: {
    fontSize: 14,
    fontWeight: '500',
    color: '#006400', // Dark green for income
  },
  summaryAmountOutflow: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B0000', // Dark red for expenses
  },
  transactionList: {
    padding: 10,
    backgroundColor: '#F3F8F3',
  },
  // File card/folder style for transactions
  transactionItem: {
    borderWidth: 1,
    borderColor: '#B0D2B0',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 0,
    shadowColor: '#004400',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
    position: 'relative',
  },
  fileTab: {
    position: 'absolute',
    top: 0,
    right: 20,
    width: 30,
    height: 6,
    backgroundColor: '#88AA88',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    zIndex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E8',
    backgroundColor: '#F8FFF8',
  },
  typeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  transactionContent: {
    marginLeft: 5,
  },
  transactionTitle: {
    fontSize: 14,
    color: '#004400', // Dark green text
    fontWeight: '600',
  },
  transactionCategory: {
    fontSize: 12,
    color: '#004400', // Dark green text with opacity
    opacity: 0.7,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-start',
    backgroundColor: '#F0FFF0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#B0D2B0',
  },
  transactionDetails: {
    padding: 10,
    backgroundColor: '#FAFFF5',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 8,
    alignSelf: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#004400', // Dark green text
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 12,
    color: '#004400', // Dark green text
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8F5E8',
    marginVertical: 6,
  },
  stampContainer: {
    position: 'absolute',
    right: 10,
    top: 8,
    transform: [{ rotate: '-15deg' }],
    opacity: 0.7,
  },
  stampText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B0000',
  },
});

// Simple 90s window close button
const WindowHeader = ({ title }: { title: string }) => (
  <View style={styles.windowHeader}>
    <View style={styles.windowButtons}>
      <View style={styles.closeButton} />
      <View style={styles.minimizeButton} />
      <View style={styles.expandButton} />
    </View>
    <Text style={styles.windowTitle}>{title}</Text>
  </View>
);

// A stamp-like component for transaction status
const StatusStamp = ({ status }: { status: string }) => {
  if (status === 'active' || status === 'ACTIVE') {
    return null; // No stamp for active transactions
  }
  
  return (
    <View style={styles.stampContainer}>
      <Text style={styles.stampText}>
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

  const totalInflow = transactions
    .filter((t: TransactionStream) => t.type === 'inflow')
    .reduce((sum: number, t: TransactionStream) => sum + t.average_amount.amount, 0);

  const totalOutflow = transactions
    .filter((t: TransactionStream) => t.type === 'outflow')
    .reduce((sum: number, t: TransactionStream) => sum + t.average_amount.amount, 0);

  return (
    <ScrollView style={styles.container}>
      {/* Date View Window */}
      <View style={styles.windowContainer}>
        <WindowHeader title="Date Details" />
        
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {formattedDate}
          </Text>
        </View>
        
        {/* Summary Section */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryAmountInflow}>
              {formatAmount(totalInflow)}
            </Text>
          </View>
          
          <View style={styles.summaryColumnLast}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={styles.summaryAmountOutflow}>
              {formatAmount(totalOutflow)}
            </Text>
          </View>
        </View>
      </View>

      {/* Transactions Window */}
      <View style={styles.windowContainer}>
        <WindowHeader title="Transactions" />
        
        <View style={styles.transactionList}>
          {transactions.map((transaction: TransactionStream, index: number) => (
            <View key={index} style={styles.transactionItem}>
              <View 
                style={[
                  styles.typeIndicator, 
                  { 
                    backgroundColor: transaction.type === 'inflow' 
                      ? '#006400' // Dark green for income
                      : '#8B0000' // Dark red for expenses
                  }
                ]} 
              />
              <View style={styles.fileTab} />
              <StatusStamp status={transaction.status} />
              
              <View style={styles.transactionHeader}>
                <View style={styles.transactionContent}>
                  <Text style={styles.transactionTitle}>
                    {transaction.merchant_name || transaction.description}
                  </Text>
                  <Text style={styles.transactionCategory}>
                    {transaction.category.join(' › ')}
                  </Text>
                </View>
                <Text 
                  style={[
                    styles.transactionAmount, 
                    transaction.type === 'inflow' 
                      ? styles.summaryAmountInflow 
                      : styles.summaryAmountOutflow
                  ]}
                >
                  {transaction.type === 'inflow' ? '+' : '-'}
                  {formatAmount(transaction.average_amount.amount)}
                </Text>
              </View>
              
              <View style={styles.transactionDetails}>
                <View style={styles.detailRow}>
                  <RefreshCw size={14} color="#004400" style={styles.detailIcon} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Frequency</Text>
                    <Text style={styles.detailValue}>
                      {transaction.frequency.toLowerCase()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.detailRow}>
                  <Clock size={14} color="#004400" style={styles.detailIcon} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Last Transaction</Text>
                    <Text style={styles.detailValue}>
                      {format(new Date(transaction.last_date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.detailRow}>
                  <Tag size={14} color="#004400" style={styles.detailIcon} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.detailValue}>
                      {transaction.status.toLowerCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

export default DayDetailView; 