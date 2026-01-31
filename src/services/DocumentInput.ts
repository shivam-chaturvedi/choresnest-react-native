export interface DocumentInput {
    name?: string;
    type?: string;
    icon?: string;
    date?: string;
    memberId?: string;
    sharedWithIds?: string[];
    filePath?: string;
    meta?: any;
    reminderDaysBefore?: number;

    // Meta fields
    category?: string;
    expiryDate?: string;
    purchaseDate?: string;
    warrantyTillDate?: string;
    billAmount?: string;
    billDate?: string;
    provider?: string;
    policyNumber?: string;
    premiumAmount?: string;
    serviceDate?: string;
    nextServiceDate?: string;
    cost?: string;
    reminderRules?: any;
}
