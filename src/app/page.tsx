import { PhoneVerificationForm } from "@/components/phone-verification-form";
import { TeleVerifyLogo } from "@/components/icons/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { getClientApplicationByClientId } from "@/lib/client-actions";

// FOR MANUAL TESTING: Replace this with an actual client_id from your Firestore 'clientApplications' collection
// if you want a default client when no client_id is in the URL.
// Set to undefined or remove if you always want the client_id from the URL.
const MANUAL_FALLBACK_CLIENT_ID: string | undefined = "";

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function HomePage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  // Get client_id from searchParams
  const clientIdFromUrl =
    typeof searchParams?.client_id === "string"
      ? searchParams.client_id
      : Array.isArray(searchParams?.client_id)
      ? searchParams.client_id[0]
      : undefined;

  // Use fallback if URL param is empty
  const clientIdToUse = clientIdFromUrl || MANUAL_FALLBACK_CLIENT_ID;

  let clientApp = null;
  let errorType:
    | "missing_client_id"
    | "invalid_client_id"
    | "inactive_client_id"
    | null = null;
  let errorMessage = "An unknown error occurred.";

  if (!clientIdToUse) {
    errorType = "missing_client_id";
    errorMessage =
      "The client_id parameter is missing from the URL or is invalid. Please ensure you are accessing this page through a valid client application link.";
  } else {
    try {
      console.log(
        `[HomePage] Attempting to fetch client application for clientId: ${clientIdToUse}`
      );
      clientApp = await getClientApplicationByClientId(clientIdToUse);

      if (!clientApp) {
        errorType = "invalid_client_id";
        errorMessage = `The provided client_id '${clientIdToUse}' is not recognized or invalid. Please check the link or contact the application provider.`;
        console.warn(
          `[HomePage] Client ID ${clientIdToUse} not found or invalid.`
        );
      } else if (clientApp.status !== "active") {
        errorType = "inactive_client_id";
        errorMessage = `The client application '${
          clientApp?.companyName || clientIdToUse
        }' is currently inactive. Please contact the application provider.`;
        console.warn(
          `[HomePage] Client ID ${clientIdToUse} found but is inactive. Company: ${clientApp.companyName}`
        );
      } else {
        console.log(
          `[HomePage] Successfully fetched active client: ${clientApp.companyName} (ID: ${clientIdToUse})`
        );
      }
    } catch (error) {
      console.error("[HomePage] Error fetching client application:", error);
      errorType = "invalid_client_id";
      errorMessage =
        "Failed to verify client application due to a server error. Please try again later.";
    }
  }

  const renderError = () => {
    let title = "Authentication Error";
    switch (errorType) {
      case "missing_client_id":
        title = "Client ID Missing or Invalid";
        break;
      case "invalid_client_id":
        title = "Invalid Client ID";
        break;
      case "inactive_client_id":
        title = "Client Application Inactive";
        break;
    }

    return (
      <Alert variant="destructive" className="mt-6">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <TeleVerifyLogo />
        </div>

        {errorType ? (
          renderError()
        ) : (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center text-primary">
                Verify Your Phone Number
                {clientApp && (
                  <span className="block text-sm font-normal text-muted-foreground mt-1">
                    for {clientApp.companyName}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground pt-1">
                Securely verify your phone number using Telegram.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Pass clientIdToUse to the form, ensuring it's not undefined */}
              <PhoneVerificationForm clientId={clientIdToUse!} />
            </CardContent>
          </Card>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Powered by Genkit & Next.js
        </p>
      </div>
    </main>
  );
}
