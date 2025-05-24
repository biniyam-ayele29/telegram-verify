// src/app/verify-telegram/page.tsx
"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  KeyRound,
  Loader2,
  BotMessageSquare,
  QrCode,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  Phone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { verifyCodeAction, type ActionFormState } from "@/lib/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TeleVerifyLogo } from "@/components/icons/logo";

const TELEGRAM_BOT_USERNAME = "Firegebeyaouthbot"; // Your bot's username

const codeSchema = z.object({
  verificationCode: z
    .string()
    .length(6, "Code must be 6 digits.")
    .regex(/^\d{6}$/, "Code must be 6 digits."),
});

function VerifyTelegramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const fullPhoneNumber = searchParams.get("phone");

  const initialFormState: ActionFormState = { success: false, message: "" };
  const [verifyCodeFormState, verifyCodeFormAction] = useActionState<
    ActionFormState,
    FormData
  >(verifyCodeAction, initialFormState);

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { verificationCode: "" },
  });

  const [isVerified, setIsVerified] = React.useState(false);

  useEffect(() => {
    if (!fullPhoneNumber) {
      toast({
        title: "Error",
        description: "Phone number missing. Please start over.",
        variant: "destructive",
      });
      router.push("/"); // Redirect if no phone number
    }
  }, [fullPhoneNumber, router, toast]);

  useEffect(() => {
    if (verifyCodeFormState?.message) {
      if (verifyCodeFormState.success) {
        toast({
          title: "Verified!",
          description: verifyCodeFormState.message,
          variant: "default",
        });
        setIsVerified(true);
      } else {
        toast({
          title: "Error",
          description: verifyCodeFormState.message,
          variant: "destructive",
        });
        if (verifyCodeFormState.field === "verificationCode") {
          codeForm.setError("verificationCode", {
            type: "manual",
            message: verifyCodeFormState.message,
          });
        } else {
          codeForm.setError("root.serverError", {
            type: "manual",
            message: verifyCodeFormState.message,
          });
        }
      }
    }
  }, [verifyCodeFormState, toast, codeForm]);

  const SubmitButton = ({
    children,
    icon,
  }: {
    children: React.ReactNode;
    icon?: React.ReactNode;
  }) => {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" className="w-full" disabled={pending || isVerified}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
        {children}
      </Button>
    );
  };

  if (isVerified) {
    return (
      <Alert variant="default" className="mt-4">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <AlertTitle>Verification Successful!</AlertTitle>
        <AlertDescription>
          Your phone number ({fullPhoneNumber}) has been successfully verified.
        </AlertDescription>
        <Button
          onClick={() => router.push("/")}
          variant="link"
          className="mt-4 p-0 h-auto"
        >
          Verify Another Number
        </Button>
      </Alert>
    );
  }

  if (!fullPhoneNumber) {
    return (
      <Alert variant="destructive" className="mt-4">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Missing Information</AlertTitle>
        <AlertDescription>
          The phone number for verification is missing. Please{" "}
          <a href="/" className="underline">
            start over
          </a>
          .
        </AlertDescription>
      </Alert>
    );
  }

  const telegramBotUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  const telegramAppUrl = `tg://resolve?domain=${TELEGRAM_BOT_USERNAME}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    telegramBotUrl
  )}`;

  return (
    <Card className="shadow-xl w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary">
          Get Your Code via Telegram
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground pt-1">
          To get your code for <strong>{fullPhoneNumber}</strong>:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 text-left">
          <p className="text-sm text-foreground flex items-start">
            <span className="font-semibold mr-2">1.</span> Open our Telegram
            bot:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center my-2">
            <Button asChild variant="outline">
              <a
                href={telegramAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BotMessageSquare className="mr-2 h-4 w-4" /> Open in Telegram
                App
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href={telegramBotUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Open in Telegram Web
              </a>
            </Button>
          </div>
          <div className="flex justify-center my-3">
            <Image
              src={qrCodeUrl}
              alt={`QR Code for Telegram bot ${TELEGRAM_BOT_USERNAME}`}
              width={150}
              height={150}
              className="rounded-md border shadow-md"
              data-ai-hint="qr code"
            />
          </div>
          <p className="text-sm text-foreground flex items-start">
            <span className="font-semibold mr-2">2.</span> In the bot, type and
            send the command "/receive" and follow the bots instructions.
          </p>
          <p className="text-sm text-foreground flex items-start">
            <span className="font-semibold mr-2">3.</span> The bot will then
            send you the 6-digit code.
          </p>
        </div>

        <hr className="my-6 border-border" />

        <div>
          <p className="text-sm text-foreground text-center mb-3">
            Enter the 6-digit code from the bot:
          </p>
          <Form {...codeForm}>
            <form
              action={(formData) => {
                if (fullPhoneNumber) {
                  formData.append("fullPhoneNumber", fullPhoneNumber);
                }
                verifyCodeFormAction(formData);
              }}
              className="space-y-4"
            >
              <FormField
                control={codeForm.control}
                name="verificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="verificationCode" className="sr-only">
                      Verification Code
                    </FormLabel>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input
                          id="verificationCode"
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit code"
                          className="pl-10 tracking-widest text-center text-lg"
                          {...field}
                          disabled={isVerified}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {codeForm.formState.errors.root?.serverError && (
                <p className="text-sm font-medium text-destructive">
                  {codeForm.formState.errors.root.serverError.message}
                </p>
              )}
              <SubmitButton icon={<KeyRound className="mr-2 h-4 w-4" />}>
                Verify My Code
              </SubmitButton>
            </form>
          </Form>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="link"
          onClick={() => router.push("/")}
          className="mx-auto text-sm"
        >
          Start Over / Change Number
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function VerifyTelegramPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <TeleVerifyLogo />
        </div>
        <Suspense
          fallback={<Loader2 className="h-12 w-12 animate-spin text-primary" />}
        >
          <VerifyTelegramContent />
        </Suspense>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Powered by Genkit & Next.js
        </p>
      </div>
    </main>
  );
}
