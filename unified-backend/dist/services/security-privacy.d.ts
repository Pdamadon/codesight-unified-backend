interface PIIDetectionResult {
    hasPII: boolean;
    detectedTypes: string[];
    maskedData: any;
    confidence: number;
}
export declare class SecurityPrivacyService {
    private prisma;
    private logger;
    private encryptionConfig;
    private encryptionKey;
    constructor();
    detectAndMaskPII(data: any): Promise<PIIDetectionResult>;
    private scanForPII;
    private detectPIIInString;
    private isPIIField;
    private getPIIType;
    private maskPIIValue;
    private maskEmail;
    private maskPhone;
    private maskName;
    private maskCreditCard;
    private maskGeneric;
    encryptData(data: any): Promise<string>;
    decryptData(encryptedData: string): Promise<any>;
    validateApiKey(apiKey: string): Promise<{
        isValid: boolean;
        userId?: string;
        roles?: string[];
    }>;
    generateApiKey(userId: string, roles?: string[]): Promise<string>;
    processDataDeletionRequest(userId: string, dataTypes?: string[]): Promise<void>;
    generateDataExport(userId: string): Promise<any>;
    private logSecurityEvent;
    private logPrivacyEvent;
    getSecurityMetrics(): Promise<any>;
    private generateSecurityAlerts;
    healthCheck(): Promise<string>;
}
export {};
