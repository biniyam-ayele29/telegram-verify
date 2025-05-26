import { PhoneVerificationForm } from "@/components/phone-verification-form";
import { TeleVerifyLogo } from "@/components/icons/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Info } from "lucide-react";
import { getClientApplicationByClientId } from "@/lib/client-actions";

interface HomePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const clientId = typeof searchParams.client_id === 'string' ? searchParams.client_id : undefined;
  let clientApp = null;
  let errorType: 'missing_client_id' | 'invalid_client_id' | 'inactive_client_id' | null = null;

  if (!clientId) {
    errorType = 'missing_client_id';
  } else {
    clientApp = await getClientApplicationByClientId(clientId);
    if (!clientApp) {
      errorType = 'invalid_client_id';
    } else if (clientApp.status !== 'active') {
      errorType = 'inactive_client_id';
      // Optionally clear clientApp if you don't want to pass inactive app details further
      // clientApp = null; 
    }
  }

  const renderError = () => {
    let title = "Authentication Error";
    let description = "An unknown error occurred.";

    switch (errorType) {
      case 'missing_client_id':
        title = "Client ID Missing";
        description = "The client_id parameter is missing from the URL. Please ensure you are accessing this page through a valid client application link.";
        break;
      case 'invalid_client_id':
        title = "Invalid Client ID";
        description = "The provided client_id is not recognized or invalid. Please check the link or contact the application provider.";
        break;
      case 'inactive_client_id':
        title = "Client Application Inactive";
        description = `The client application '${clientApp?.companyName || 'Unknown'}' is currently inactive. Please contact the application provider.`;
        break;
    }

    return (
      <Alert variant="destructive" className="mt-6">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {description}
        </AlertDescription>
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
              <PhoneVerificationForm />
              {/* 
                If you need to pass clientId to the form later:
                <PhoneVerificationForm clientId={clientId} /> 
              */}
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
