
// src/lib/client-actions.ts
'use server';

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './firebase';
import type { ClientApplication } from './admin-types'; // Assuming this type is defined

/**
 * Fetches a client application by its clientId.
 * @param clientId The client ID to search for.
 * @returns The ClientApplication if found and active, null otherwise.
 */
export async function getClientApplicationByClientId(
  clientId: string
): Promise<ClientApplication | null> {
  if (!clientId) {
    return null;
  }

  console.log(`[ClientActions] Fetching client application by clientId: ${clientId}`);
  try {
    const clientAppsRef = collection(db, 'clientApplications');
    const q = query(
      clientAppsRef,
      where('clientId', '==', clientId),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`[ClientActions] No client application found with clientId: ${clientId}`);
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    const application: ClientApplication = {
      id: doc.id,
      clientId: data.clientId,
      clientSecretHash: data.clientSecretHash,
      companyName: data.companyName,
      contactEmail: data.contactEmail,
      redirectUris: data.redirectUris,
      status: data.status,
      createdAt: data.createdAt?.toDate(), // Convert Firestore Timestamp to Date
      updatedAt: data.updatedAt?.toDate(), // Convert Firestore Timestamp to Date
    };
    
    console.log(`[ClientActions] Found client application: ${application.companyName}, Status: ${application.status}`);
    return application;

  } catch (error) {
    console.error('[ClientActions] Error fetching client application by clientId:', error);
    return null; // Or throw the error if you want to handle it differently upstream
  }
}
