// src/lib/client-actions.ts
"use server";

import { adminDb } from "./firebase-admin";
import type { ClientApplication } from "./admin-types";

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

  console.log(
    `[ClientActions] Fetching client application by clientId: ${clientId}`
  );
  try {
    const snapshot = await adminDb
      .collection("clientApplications")
      .where("clientId", "==", clientId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log(
        `[ClientActions] No client application found with clientId: ${clientId}`
      );
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    const application: ClientApplication = {
      id: doc.id,
      clientId: data.clientId,
      clientSecretHash: data.clientSecretHash,
      companyName: data.companyName,
      contactEmail: data.contactEmail,
      redirectUris: data.redirectUris,
      status: data.status,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };

    console.log(
      `[ClientActions] Found client application: ${application.companyName}, Status: ${application.status}`
    );
    return application;
  } catch (error) {
    console.error(
      "[ClientActions] Error fetching client application by clientId:",
      error
    );
    return null;
  }
}
