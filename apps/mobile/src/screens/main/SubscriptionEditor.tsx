/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Calendar, DollarSign, Tag, Clock, Save } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format, parseISO } from 'date-fns';
import Toast from 'react-native-toast-message';

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

interface TransactionWithType extends TransactionStream {
  type: 'inflow' | 'outflow';
  id?: string;
}

interface RouteParams {
  mode: 'create' | 'edit';
  subscription?: TransactionWithType;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  form: {
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
  },
  inputError: {
    borderColor: '#FF0000',
    backgroundColor: '#FFF0F0',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginTop: 4,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  selectPlaceholder: {
    color: '#888888',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    color: '#000000',
  },
  typeContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#000000',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#000000',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#000000',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  optionsList: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    maxHeight: 180,
  },
  optionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 14,
    color: '#000000',
  },
  lastOption: {
    borderBottomWidth: 0,
  },
});

// Frequency options
const FREQUENCY_OPTIONS = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Semiannually', value: 'semiannually' },
  { label: 'Annually', value: 'annually' },
];

// Category options
const CATEGORY_OPTIONS = [
  'Subscription',
  'Entertainment',
  'Streaming Service',
  'Software',
  'Utilities',
  'Rent/Mortgage',
  'Insurance',
  'Groceries',
  'Transportation',
  'Healthcare',
  'Education',
  'Personal Care',
  'Other'
];

const SubscriptionEditor = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, subscription } = route.params as RouteParams;

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('');
  const [nextDate, setNextDate] = useState<Date>(new Date());
  const [isActive, setIsActive] = useState(true);
  const [type, setType] = useState<'inflow' | 'outflow'>('outflow');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // UI state
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [showFrequencyOptions, setShowFrequencyOptions] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);

  // Initialize with existing data if in edit mode
  useEffect(() => {
    if (mode === 'edit' && subscription) {
      setName(subscription.merchant_name || subscription.description);
      setAmount((subscription.average_amount.amount).toString());
      setCategory(subscription.category || []);
      setFrequency(subscription.frequency);
      setNextDate(parseISO(subscription.predicted_next_date));
      setIsActive(subscription.is_active);
      setType(subscription.type);
    }
  }, [mode, subscription]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }
    
    if (!category.length) {
      newErrors.category = 'Please select at least one category';
    }
    
    if (!frequency) {
      newErrors.frequency = 'Please select a frequency';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSave = () => {
    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Please correct the errors in the form'
      });
      return;
    }
    
    // Implement actual save logic here
    // For now, we'll just simulate saving
    
    Toast.show({
      type: 'success',
      text1: `Subscription ${mode === 'create' ? 'added' : 'updated'} successfully`
    });
    
    navigation.goBack();
  };

  // Format amount as currency for display
  const formatAmountForDisplay = (value: string) => {
    if (!value) return '';
    
    try {
      const number = parseFloat(value);
      if (isNaN(number)) return value;
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(number);
    } catch (e) {
      return value;
    }
  };

  // Handle amount input changes
  const handleAmountChange = (text: string) => {
    // Strip out any non-numeric characters except decimal point
    const numericValue = text.replace(/[^0-9.]/g, '');
    setAmount(numericValue);
  };

  // Handle category selection
  const handleCategorySelect = (selectedCategory: string) => {
    // If already selected, remove it, otherwise add it
    if (category.includes(selectedCategory)) {
      setCategory(category.filter(c => c !== selectedCategory));
    } else {
      setCategory([...category, selectedCategory]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {mode === 'create' ? 'Add Subscription' : 'Edit Subscription'}
          </Text>
        </View>
        
        <ScrollView style={styles.form}>
          {/* Basic Information */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={[styles.input, errors.name ? styles.inputError : null]}
                value={name}
                onChangeText={setName}
                placeholder="Netflix, Spotify, etc."
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={[styles.input, errors.amount ? styles.inputError : null]}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                keyboardType="numeric"
              />
              {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}
            </View>
            
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'outflow' && styles.typeButtonActive
                ]}
                onPress={() => setType('outflow')}
              >
                <Text style={[
                  styles.typeButtonText,
                  type === 'outflow' && styles.typeButtonTextActive
                ]}>
                  Expense
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'inflow' && styles.typeButtonActive
                ]}
                onPress={() => setType('inflow')}
              >
                <Text style={[
                  styles.typeButtonText,
                  type === 'inflow' && styles.typeButtonTextActive
                ]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#E0E0E0', true: '#000000' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
          
          {/* Category and Frequency */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                style={[styles.selectButton, errors.category ? styles.inputError : null]}
                onPress={() => setShowCategoryOptions(!showCategoryOptions)}
              >
                <Tag size={16} color="#888888" style={{ marginRight: 8 }} />
                <Text style={[
                  styles.selectText,
                  category.length === 0 && styles.selectPlaceholder
                ]}>
                  {category.length > 0 ? category.join(', ') : 'Select categories'}
                </Text>
              </TouchableOpacity>
              {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
              
              {showCategoryOptions && (
                <View style={styles.optionsList}>
                  <ScrollView nestedScrollEnabled={true}>
                    {CATEGORY_OPTIONS.map((option, index) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.optionItem,
                          index === CATEGORY_OPTIONS.length - 1 && styles.lastOption
                        ]}
                        onPress={() => handleCategorySelect(option)}
                      >
                        <Text style={styles.optionText}>
                          {category.includes(option) ? '✓ ' : ''}
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Frequency</Text>
              <TouchableOpacity
                style={[styles.selectButton, errors.frequency ? styles.inputError : null]}
                onPress={() => setShowFrequencyOptions(!showFrequencyOptions)}
              >
                <Clock size={16} color="#888888" style={{ marginRight: 8 }} />
                <Text style={[
                  styles.selectText,
                  !frequency && styles.selectPlaceholder
                ]}>
                  {frequency ? FREQUENCY_OPTIONS.find(opt => opt.value === frequency)?.label : 'Select frequency'}
                </Text>
              </TouchableOpacity>
              {errors.frequency ? <Text style={styles.errorText}>{errors.frequency}</Text> : null}
              
              {showFrequencyOptions && (
                <View style={styles.optionsList}>
                  {FREQUENCY_OPTIONS.map((option, index) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionItem,
                        index === FREQUENCY_OPTIONS.length - 1 && styles.lastOption
                      ]}
                      onPress={() => {
                        setFrequency(option.value);
                        setShowFrequencyOptions(false);
                      }}
                    >
                      <Text style={styles.optionText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Next Payment/Income Date</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setDatePickerVisible(true)}
              >
                <Calendar size={16} color="#888888" style={{ marginRight: 8 }} />
                <Text style={styles.selectText}>
                  {format(nextDate, 'MMMM d, yyyy')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Date Picker Modal */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={(date) => {
            setNextDate(date);
            setDatePickerVisible(false);
          }}
          onCancel={() => setDatePickerVisible(false)}
          date={nextDate}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default SubscriptionEditor; 