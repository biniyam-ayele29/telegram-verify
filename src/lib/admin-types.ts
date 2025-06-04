// src/lib/admin-types.ts

export interface ClientApplication {
  id?: string; // Firestore document ID
  clientId: string;
  clientSecretHash: string; 
  companyName: string;
  contactEmail: string;
  redirectUris: string[]; 
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

export interface NewClientApplicationResult extends ClientApplication {
  clientSecretPlainText?: string; 
}

export interface UpdateClientFormState {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  updatedClient?: ClientApplication;
}
