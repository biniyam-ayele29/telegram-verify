// src/lib/admin-actions.ts
'use server';

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid'; // For generating client ID/secret
import { db } from './firebase';
import { collection, addDoc, getDocs, Timestamp, query, orderBy } from 'firebase/firestore';
import type { ClientApplication, NewClientApplicationResult } from './admin-types';

// TODO: Replace with a proper crypto library like bcrypt for hashing secrets in production.
// Storing plain text secrets or using simple hashing is a major security vulnerability.
async function hashClientSecret(secret: string): Promise<string> {
  console.warn("SECURITY WARNING: Client secret is NOT being securely hashed. Implement proper hashing (e.g., bcrypt) in production.");
  // Placeholder: In a real app, use bcrypt.hash(secret, saltRounds);
  return `unhashed_${secret}`; // DO NOT USE THIS IN PRODUCTION
}

const AddClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  contactEmail: z.string().email('Invalid email address.'),
  redirectUris: z.string().min(1, 'At least one Redirect URI is required.').transform(val => val.split(',').map(uri => uri.trim()).filter(uri => uri.length > 0)),
});

export interface AddClientFormState {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  newClient?: NewClientApplicationResult; // To return the generated ID/Secret
}

export async function addClientApplicationAction(
  prevState: AddClientFormState,
  formData: FormData
): Promise<AddClientFormState> {
  const validatedFields = AddClientSchema.safeParse({
    companyName: formData.get('companyName'),
    contactEmail: formData.get('contactEmail'),
    redirectUris: formData.get('redirectUris'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed. Please check the fields.',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { companyName, contactEmail, redirectUris } = validatedFields.data;

  if (redirectUris.some(uri => !uri.startsWith('https://'))) {
    return {
      success: false,
      message: 'All Redirect URIs must start with https:// for security.',
      fieldErrors: { redirectUris: ['All Redirect URIs must use https.'] }
    }
  }

  const clientId = uuidv4();
  const clientSecretPlainText = uuidv4(); // Generate a strong random secret
  
  // SECURITY TODO: Hash the clientSecretPlainText securely before storing
  const clientSecretHash = await hashClientSecret(clientSecretPlainText);

  try {
    const newClientData: Omit<ClientApplication, 'id' | 'createdAt' | 'updatedAt'> = {
      clientId,
      clientSecretHash,
      companyName,
      contactEmail,
      redirectUris,
      status: 'active',
    };

    const docRef = await addDoc(collection(db, 'clientApplications'), {
      ...newClientData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('[AdminAction] Client application added with ID: ', docRef.id);
    return {
      success: true,
      message: 'Client application added successfully!',
      newClient: {
        ...newClientData,
        id: docRef.id,
        clientSecretPlainText, // Return plain text secret ONCE for admin to copy
        createdAt: new Date(), // Approximate, actual is server timestamp
        updatedAt: new Date(),
      },
    };
  } catch (error: any) {
    console.error('[AdminAction] Error adding client application:', error);
    return {
      success: false,
      message: `Failed to add client application: ${error.message || 'Unknown error'}`,
    };
  }
}

export async function getClientApplicationsAction(): Promise<{ applications?: ClientApplication[], error?: string }> {
  try {
    const q = query(collection(db, 'clientApplications'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const applications: ClientApplication[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      applications.push({
        id: doc.id,
        clientId: data.clientId,
        clientSecretHash: data.clientSecretHash, // This is the stored (currently unhashed) secret
        companyName: data.companyName,
        contactEmail: data.contactEmail,
        redirectUris: data.redirectUris,
        status: data.status,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
      });
    });
    return { applications };
  } catch (error: any) {
    console.error('[AdminAction] Error fetching client applications:', error);
    return { error: `Failed to fetch client applications: ${error.message || 'Unknown error'}` };
  }
}

// Install uuid: npm install uuid @types/uuid
// For hashing, in production, use a library like bcrypt: npm install bcrypt @types/bcrypt
// Example hashing with bcrypt:
// import bcrypt from 'bcrypt';
// const saltRounds = 10;
// const clientSecretHash = await bcrypt.hash(clientSecretPlainText, saltRounds);
// To verify: const match = await bcrypt.compare(submittedSecret, storedHash);
