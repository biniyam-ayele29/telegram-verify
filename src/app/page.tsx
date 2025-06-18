
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

// FOR DEVELOPMENT TESTING: Replace this with an actual client_id from your Firestore 'clientApplications' collection
// if you want a default client when no client_id is in the URL.
// This should be UNDEFINED for production.
const MANUAL_FALLBACK_CLIENT_ID: string | undefined =
  process.env.NODE_ENV === "development" ? "bf4c51f7-064c-430e-b4e2-c39a27985b49" : undefined;

// FOR DEVELOPMENT TESTING: You can provide a fallback user_app_id for development here.
// This should be UNDEFINED for production.
const MANUAL_FALLBACK_USER_APP_ID: string | undefined =
  process.env.NODE_ENV === "development" ? "test-user-123" : undefined;


type SearchParams = { [key: string]: string | string[] | undefined };

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = searchParams ?? {};

  // Handle client_id
  const rawClientId = params.client_id;
  const clientIdFromUrl = Array.isArray(rawClientId) ? rawClientId[0] : rawClientId;
  let clientIdToUse = typeof clientIdFromUrl === "string" && clientIdFromUrl.trim() !== ""
    ? clientIdFromUrl
    : MANUAL_FALLBACK_CLIENT_ID;
  if (clientIdToUse === MANUAL_FALLBACK_CLIENT_ID && !MANUAL_FALLBACK_CLIENT_ID) {
    clientIdToUse = undefined;
  }

  // Handle user_app_id
  const rawUserAppId = params.user_app_id;
  const userAppIdFromUrl = Array.isArray(rawUserAppId) ? rawUserAppId[0] : rawUserAppId;
  let userAppIdToUse = typeof userAppIdFromUrl === "string" && userAppIdFromUrl.trim() !== ""
    ? userAppIdFromUrl
    : MANUAL_FALLBACK_USER_APP_ID;
  if (userAppIdToUse === MANUAL_FALLBACK_USER_APP_ID && !MANUAL_FALLBACK_USER_APP_ID) {
    userAppIdToUse = undefined;
  }


  let clientApp = null;
  let errorType:
    | "missing_params"
    | "invalid_client_id"
    | "inactive_client_id"
    | null = null;
  let errorMessage = "An unknown error occurred.";

  if (!clientIdToUse || !userAppIdToUse) {
    errorType = "missing_params";
    let missingFields = [];
    if (!clientIdToUse) missingFields.push("client_id");
    if (!userAppIdToUse) missingFields.push("user_app_id");
    
    errorMessage =
      `The following required parameters are missing or invalid: ${missingFields.join(', ')}. Please ensure you are accessing this page through a valid client application link.`;
      if (process.env.NODE_ENV === "development" && (!MANUAL_FALLBACK_CLIENT_ID || !MANUAL_FALLBACK_USER_APP_ID)) {
        errorMessage += " For testing, ensure valid fallbacks (MANUAL_FALLBACK_CLIENT_ID, MANUAL_FALLBACK_USER_APP_ID) are set in src/app/page.tsx or provide them in the URL."
      }
  } else {
    try {
      clientApp = await getClientApplicationByClientId(clientIdToUse);
      if (!clientApp) {
        errorType = "invalid_client_id";
        errorMessage = `The provided client_id '${clientIdToUse}' is not recognized or invalid. Please check the link or contact the application provider.`;
      } else if (clientApp.status !== "active") {
        errorType = "inactive_client_id";
        errorMessage = `The client application '${
          clientApp?.companyName || clientIdToUse
        }' is currently inactive. Please contact the application provider.`;
      }
    } catch (error) {
      errorType = "invalid_client_id"; 
      errorMessage =
        "Failed to verify client application due to a server error. Please try again later.";
    }
  }

  const renderError = () => {
    let title = "Authentication Error";
    switch (errorType) {
      case "missing_params":
        title = "Required Parameters Missing";
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
              <PhoneVerificationForm clientId={clientIdToUse!} userAppId={userAppIdToUse!} />
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

