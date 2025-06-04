// src/lib/admin-actions.ts
'use server';

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid'; 
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import type { ClientApplication, NewClientApplicationResult, UpdateClientFormState } from './admin-types';


async function hashClientSecret(secret: string): Promise<string> {
  console.warn("SECURITY WARNING: Client secret is NOT being securely hashed. Implement proper hashing (e.g., bcrypt) in production.");
  return `unhashed_${secret}`; 
}

const ClientApplicationSchemaBase = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  contactEmail: z.string().email('Invalid email address.'),
  redirectUris: z.string().min(1, 'At least one Redirect URI is required.')
    .transform(val => val.split(',').map(uri => uri.trim()).filter(uri => uri.length > 0))
    .refine(uris => uris.every(uri => uri.startsWith('https://')), {
      message: 'All Redirect URIs must start with https:// for security.',
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
        clientSecretPlainText,
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
    const q = query(collection(db, 'clientApplications'), orderBy('createdAt', 'desc'));
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

export async function getClientApplicationById(id: string): Promise<{ application?: ClientApplication, error?: string }> {
  try {
    const clientDocRef = doc(db, 'clientApplications', id);
    const docSnap = await getDoc(clientDocRef);

    if (!docSnap.exists()) {
      return { error: 'Client application not found.' };
    }

    const data = docSnap.data();
    const application: ClientApplication = {
      id: docSnap.id,
      clientId: data.clientId,
      clientSecretHash: data.clientSecretHash,
      companyName: data.companyName,
      contactEmail: data.contactEmail,
      redirectUris: data.redirectUris,
      status: data.status,
      createdAt: (data.createdAt as Timestamp)?.toDate(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate(),
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
    const clientDocRef = doc(db, 'clientApplications', id);
    
    // Check if doc exists before update (optional, but good practice)
    const docSnap = await getDoc(clientDocRef);
    if (!docSnap.exists()) {
      return { success: false, message: 'Client application not found for update.' };
    }

    const updatedData: Partial<ClientApplication> & { updatedAt: Timestamp } = {
      companyName,
      contactEmail,
      redirectUris,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(clientDocRef, updatedData);

    console.log('[AdminAction] Client application updated with ID: ', id);
    return {
      success: true,
      message: 'Client application updated successfully!',
      updatedClient: {
        ...docSnap.data() as ClientApplication, // Old data for fields not updated
        ...updatedData, // Overwrite with new data
        id,
        createdAt: (docSnap.data().createdAt as Timestamp).toDate(), // Preserve original creation date
        updatedAt: updatedData.updatedAt.toDate(), // Convert new timestamp
      },
    };
  } catch (error: any) {
    console.error('[AdminAction] Error updating client application:', error);
    return {
      success: false,
      message: `Failed to update client application: ${error.message || 'Unknown error'}`,
    };
  }
}
