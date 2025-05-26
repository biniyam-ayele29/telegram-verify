// src/lib/admin-types.ts

export interface ClientApplication {
  id?: string; // Firestore document ID
  clientId: string;
  clientSecretHash: string; // In production, this MUST be a secure hash of the secret
  companyName: string;
  contactEmail: string;
  redirectUris: string[]; // Array of allowed redirect URIs
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

// For returning the generated secret once upon creation
export interface NewClientApplicationResult extends ClientApplication {
  clientSecretPlainText?: string; 
}
