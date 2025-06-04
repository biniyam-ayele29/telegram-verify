
// src/lib/admin-actions.ts
'use server';

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid'; 
import { db } from './firebase'; // Using client 'db' for web actions, adminDb for server-only setup if needed
import { adminDb } from './firebase-admin'; // For server-side admin operations
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import type { ClientApplication, NewClientApplicationResult, UpdateClientFormState } from './admin-types';


async function hashClientSecret(secret: string): Promise<string> {
  // In a real app, use bcrypt or a similar library.
  // For this example, we are not truly hashing for simplicity of showing the secret.
  console.warn("SECURITY WARNING: Client secret is NOT being securely hashed in hashClientSecret. Implement proper hashing (e.g., bcrypt) in production.");
  // Storing it as "unhashed_" + secret would be insecure.
  // A real hash function would be one-way.
  // For the purpose of this example app where the plain text secret is shown once,
  // we will store a placeholder or a "pseudo-hash".
  // If you need to verify secrets, you MUST use a proper hashing library like bcrypt.
  // For this example, let's assume it's stored as a placeholder to indicate it was "processed".
  return `processed_secret_${secret.substring(0, 4)}...`; // NOT a real hash
}

const ClientApplicationSchemaBase = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  contactEmail: z.string().email('Invalid email address.'),
  redirectUris: z.string().min(1, 'At least one Redirect URI is required.')
    .transform(val => val.split(',').map(uri => uri.trim()).filter(uri => uri.length > 0))
    .refine(uris => uris.every(uri => uri.startsWith('https://') || uri.startsWith('http://localhost')), { // Allow http://localhost for dev
      message: 'All Redirect URIs must start with https:// (or http://localhost for development).',
    }),
});

export interface AddClientFormState {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  newClient?: NewClientApplicationResult;
}

export async function addClientApplicationAction(
  prevState: AddClientFormState,
  formData: FormData
): Promise<AddClientFormState> {
  const validatedFields = ClientApplicationSchemaBase.safeParse({
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

  const clientId = uuidv4();
  const clientSecretPlainText = uuidv4(); 
  // IMPORTANT: In a real app, the plain text secret should NOT be stored.
  // Only its hash should be stored. We are "hashing" it here for consistency
  // but hashClientSecret in this example is a placeholder.
  const clientSecretHash = await hashClientSecret(clientSecretPlainText);

  try {
    const newClientData: Omit<ClientApplication, 'id' | 'createdAt' | 'updatedAt'> = {
      clientId,
      clientSecretHash, // Store the "hashed" version
      companyName,
      contactEmail,
      redirectUris,
      status: 'active',
    };

    const docRef = await addDoc(collection(adminDb, 'clientApplications'), { // Use adminDb for server-side writes
      ...newClientData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('[AdminAction] Client application added with ID: ', docRef.id);
    return {
      success: true,
      message: 'Client application added successfully!',
      newClient: { // This is for display, includes the plain text secret temporarily
        ...newClientData,
        id: docRef.id,
        clientSecretPlainText, // Return plain text secret for one-time display
        createdAt: new Date(), 
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
    const q = query(collection(adminDb, 'clientApplications'), orderBy('createdAt', 'desc')); // Use adminDb
    const querySnapshot = await getDocs(q);
    const applications: ClientApplication[] = [];
    querySnapshot.forEach((clientDoc) => {
      const data = clientDoc.data();
      applications.push({
        id: clientDoc.id,
        clientId: data.clientId,
        clientSecretHash: data.clientSecretHash,
        companyName: data.companyName,
        contactEmail: data.contactEmail,
        redirectUris: data.redirectUris || [], // Ensure redirectUris is always an array
        status: data.status || 'disabled', // Provide a default status
        // Handle potential null/undefined timestamps gracefully
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(0),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(0),
      });
    });
    return { applications };
  } catch (error: any) {
    console.error('[AdminAction] Error fetching client applications:', error);
    return { error: `Failed to fetch client applications: ${error.message || 'Unknown error'}` };
  }
}

export async function getClientApplicationById(id: string): Promise<{ application?: ClientApplication, error?: string }> {
  try {
    const clientDocRef = doc(adminDb, 'clientApplications', id); // Use adminDb
    const docSnap = await getDoc(clientDocRef);

    if (!docSnap.exists()) {
      return { error: 'Client application not found.' };
    }

    const data = docSnap.data();
    if (!data) { // Should not happen if docSnap.exists() is true, but good check
        return { error: 'Client application data is missing.' };
    }
    const application: ClientApplication = {
      id: docSnap.id,
      clientId: data.clientId,
      clientSecretHash: data.clientSecretHash,
      companyName: data.companyName,
      contactEmail: data.contactEmail,
      redirectUris: data.redirectUris || [],
      status: data.status || 'disabled',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(0),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(0),
    };
    return { application };
  } catch (error: any) {
    console.error(`[AdminAction] Error fetching client application by ID ${id}:`, error);
    return { error: `Failed to fetch client application: ${error.message || 'Unknown error'}` };
  }
}

export async function updateClientApplicationAction(
  prevState: UpdateClientFormState,
  formData: FormData
): Promise<UpdateClientFormState> {
  const id = formData.get('id') as string;
  if (!id) {
    return { success: false, message: 'Client ID is missing.' };
  }

  const validatedFields = ClientApplicationSchemaBase.safeParse({
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

  try {
    const clientDocRef = doc(adminDb, 'clientApplications', id); // Use adminDb
    
    const docSnap = await getDoc(clientDocRef);
    if (!docSnap.exists()) {
      return { success: false, message: 'Client application not found for update.' };
    }
    const existingData = docSnap.data();
    if (!existingData) {
        return { success: false, message: 'Existing client application data is missing.' };
    }


    const updatedData: Partial<Omit<ClientApplication, 'id' | 'createdAt' | 'clientId' | 'clientSecretHash'>> & { updatedAt: Timestamp } = {
      companyName,
      contactEmail,
      redirectUris,
      // status can also be updated if there's a form field for it
      updatedAt: Timestamp.now(),
    };

    await updateDoc(clientDocRef, updatedData);

    console.log('[AdminAction] Client application updated with ID: ', id);
    
    // Construct the updatedClient for the response by merging existing and updated data
    const returnedClient: ClientApplication = {
        id: id,
        clientId: existingData.clientId, // Keep original clientId
        clientSecretHash: existingData.clientSecretHash, // Keep original secret hash
        companyName: updatedData.companyName || existingData.companyName,
        contactEmail: updatedData.contactEmail || existingData.contactEmail,
        redirectUris: updatedData.redirectUris || existingData.redirectUris || [],
        status: existingData.status, // Status not updated in this action, keep original
        createdAt: existingData.createdAt instanceof Timestamp ? existingData.createdAt.toDate() : new Date(0),
        updatedAt: updatedData.updatedAt.toDate(),
    };
    
    return {
      success: true,
      message: 'Client application updated successfully!',
      updatedClient: returnedClient,
    };
  } catch (error: any) {
    console.error('[AdminAction] Error updating client application:', error);
    return {
      success: false,
      message: `Failed to update client application: ${error.message || 'Unknown error'}`,
    };
  }
}
