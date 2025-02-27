export interface BankConnection {
    id: string;
    userId: string;
    plaidAccessToken: string;
    plaidItemId: string;
    institutionId: string;
    institutionName?: string;
    status: 'active' | 'inactive';
    itemStatus: string;
    lastStatusUpdate: Date;
    errorCode?: string;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    deleteReason?: string;
  }
  
  export interface CreateBankConnectionDTO {
    plaidAccessToken: string;
    plaidItemId: string;
    institutionId: string;
    institutionName?: string;
  }
  
  export interface UpdateBankConnectionDTO {
    itemStatus?: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    status?: 'active' | 'inactive';
  }