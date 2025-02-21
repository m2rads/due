export interface CreateLinkTokenRequest {
  address: string;
}

export interface ExchangeTokenRequest {
  public_token: string;
}

export interface PlaidBalanceResponse {
  Balance: unknown; // TODO: Type this properly
}

export interface PlaidRecurringResponse {
  recurring_transactions: unknown; // TODO: Type this properly
}
