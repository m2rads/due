// Calendar and transaction types used in the calendar views

export interface Amount {
  amount: number;
}

export interface TransactionStream {
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

export interface RecurringTransactions {
  inflow_streams: TransactionStream[];
  outflow_streams: TransactionStream[];
}

export interface TransactionState {
  data: RecurringTransactions | null;
  isLoading: boolean;
  error: string | null;
}

export interface RouteParams {
  transactions?: RecurringTransactions;
  freshlyLinked?: boolean;
  unlinked?: boolean;
  timestamp?: number;
}

export interface TransactionWithType extends TransactionStream {
  type: 'inflow' | 'outflow';
  id?: string; // Optional ID for operations
}

// Props for the CalendarDay component
export interface CalendarDayProps {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  inflowCount: number;
  outflowCount: number;
  onPress: (day: Date) => void;
}

// Props for the Calendar component
export interface CalendarProps {
  currentDate: Date;
  selectedDate: Date;
  getTransactionsForDay: (day: Date) => TransactionWithType[];
  onDateSelect: (day: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  isLoading?: boolean;
}

// Props for the TransactionPreview component
export interface TransactionPreviewProps {
  selectedDate: Date;
  selectedDayTransactions: TransactionWithType[];
  upcomingTransactions: TransactionWithType[];
  isLoading: boolean;
  onViewAllTransactions: (day: Date) => void;
  onManageSubscriptions: () => void;
}

// Props for the TransactionItem component
export interface TransactionItemProps {
  transaction: TransactionWithType;
  onPress: (date: Date) => void;
} 