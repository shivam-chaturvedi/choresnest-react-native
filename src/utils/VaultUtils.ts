import { VaultDocument } from '../contexts/FamilyContext';

export interface VaultAlert {
    id: string;
    icon: string;
    name: string;
    message: string;
    type: 'warning' | 'info' | 'danger';
    documentId: string;
}

export const generateAlerts = (documents: VaultDocument[]): VaultAlert[] => {
    const alerts: VaultAlert[] = [];
    const now = new Date();
    const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    documents.forEach(doc => {
        // Warranty expiry alerts
        if (doc.type === 'warranty' && doc.warrantyTillDate) {
            const expiryDate = new Date(doc.warrantyTillDate);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 0) {
                alerts.push({
                    id: `${doc.id}-expired`,
                    icon: doc.icon || 'file',
                    name: doc.name,
                    message: 'Warranty expired',
                    type: 'danger',
                    documentId: doc.id,
                });
            } else if (daysUntilExpiry <= 15) {
                alerts.push({
                    id: `${doc.id}-expiring`,
                    icon: doc.icon || 'file',
                    name: doc.name,
                    message: `Warranty expires in ${daysUntilExpiry} days`,
                    type: 'warning',
                    documentId: doc.id,
                });
            }
        }

        // Service due alerts
        if (doc.type === 'service' && doc.nextServiceDate) {
            const serviceDate = new Date(doc.nextServiceDate);
            const daysUntilService = Math.ceil((serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilService < 0) {
                alerts.push({
                    id: `${doc.id}-overdue`,
                    icon: doc.icon || 'file',
                    name: doc.name,
                    message: 'Service overdue',
                    type: 'danger',
                    documentId: doc.id,
                });
            } else if (daysUntilService <= 15) {
                alerts.push({
                    id: `${doc.id}-due`,
                    icon: doc.icon || 'file',
                    name: doc.name,
                    message: `Service due in ${daysUntilService} days`,
                    type: 'info',
                    documentId: doc.id,
                });
            }
        }

        // Insurance alerts (example: if we had renewal date)
        if (doc.type === 'insurance' && doc.expiryDate) {
            const expiryDate = new Date(doc.expiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                alerts.push({
                    id: `${doc.id}-renewal`,
                    icon: doc.icon || 'file',
                    name: doc.name,
                    message: `Renewal due in ${daysUntilExpiry} days`,
                    type: 'info',
                    documentId: doc.id,
                });
            }
        }
    });

    return alerts;
};

export const getCategoryCounts = (documents: VaultDocument[]): Record<string, number> => {
    const counts: Record<string, number> = {
        warranty: 0,
        bill: 0,
        insurance: 0,
        service: 0,
        certificate: 0,
        receipt: 0,
        other: 0,
    };

    documents.forEach(doc => {
        if (counts[doc.type] !== undefined) {
            counts[doc.type]++;
        } else {
            counts.other++;
        }
    });

    return counts;
};
