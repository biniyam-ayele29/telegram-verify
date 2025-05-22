
// src/components/phone-verification-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Smartphone, KeyRound, Loader2, CheckCircle2, ArrowLeft, Globe, Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Not used, but kept for consistency
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { sendCodeAction, verifyCodeAction } from "@/lib/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const phoneSchema = z.object({
  countryCode: z.string()
    .min(2, "Min 2 chars (e.g. +1)")
    .max(4, "Max 4 chars (e.g. +999)")
    .regex(/^\+\d{1,3}$/, "Invalid format. Must start with + (e.g., +1, +44)"),
  localPhoneNumber: z.string()
    .min(7, "Phone number is too short.")
    .max(14, "Phone number is too long.")
    .regex(/^\d+$/, "Phone number must contain only digits."),
});

const codeSchema = z.object({
  verificationCode: z.string()
    .length(6, "Code must be 6 digits.")
    .regex(/^\d{6}$/, "Code must be 6 digits."),
});

type Step = "phoneNumber" | "verificationCode" | "verified";
interface CurrentPhoneNumber {
  countryCode: string;
  localPhoneNumber: string;
}

export function PhoneVerificationForm() {
  const [step, setStep] = useState<Step>("phoneNumber");
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState<CurrentPhoneNumber | null>(null);
  const { toast } = useToast();

  // Form state for sending code
  const [sendCodeFormState, sendCodeFormAction] = useFormState(sendCodeAction, { success: false, message: "" });
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { countryCode: "+1", localPhoneNumber: "" },
  });

  // Form state for verifying code
  const [verifyCodeFormState, verifyCodeFormAction] = useFormState(verifyCodeAction, { success: false, message: "" });
  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { verificationCode: "" },
  });

  useEffect(() => {
    if (sendCodeFormState?.message) {
      if (sendCodeFormState.success) {
        toast({
          title: "Success",
          description: sendCodeFormState.message,
          variant: "default",
        });
        setCurrentPhoneNumber({
            countryCode: phoneForm.getValues("countryCode"),
            localPhoneNumber: phoneForm.getValues("localPhoneNumber"),
        });
        setStep("verificationCode");
        codeForm.reset();
      } else {
        toast({
          title: "Error",
          description: sendCodeFormState.message,
          variant: "destructive",
        });
         if (sendCodeFormState.field === "countryCode") {
          phoneForm.setError("countryCode", { type: "manual", message: sendCodeFormState.message });
        } else if (sendCodeFormState.field === "localPhoneNumber") {
            phoneForm.setError("localPhoneNumber", { type: "manual", message: sendCodeFormState.message });
        } else if (sendCodeFormState.field === "fullPhoneNumber") { // Generic error not tied to a specific part
            phoneForm.setError("countryCode", { type: "manual", message: sendCodeFormState.message });
        }
      }
    }
  }, [sendCodeFormState, toast, phoneForm, codeForm]);

  useEffect(() => {
    if (verifyCodeFormState?.message) {
      if (verifyCodeFormState.success) {
        toast({
          title: "Verified!",
          description: verifyCodeFormState.message,
          variant: "default",
        });
        setStep("verified");
      } else {
        toast({
          title: "Error",
          description: verifyCodeFormState.message,
          variant: "destructive",
        });
        if (verifyCodeFormState.field === "verificationCode") {
          codeForm.setError("verificationCode", { type: "manual", message: verifyCodeFormState.message });
        }
      }
    }
  }, [verifyCodeFormState, toast, codeForm]);
  
  const handleBackToPhoneInput = () => {
    setStep("phoneNumber");
    setCurrentPhoneNumber(null);
    phoneForm.reset({ countryCode: "+1", localPhoneNumber: "" });
    codeForm.reset();
  };

  const SubmitButton = ({ children, icon }: { children: React.ReactNode, icon?: React.ReactNode }) => {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
        {children}
      </Button>
    );
  };

  if (step === "verified") {
    return (
      <Alert variant="default" className="mt-4">
        <CheckCircle2 className="h-5 w-5" />
        <AlertTitle>Verification Successful!</AlertTitle>
        <AlertDescription>
          Your phone number ({currentPhoneNumber?.countryCode}{currentPhoneNumber?.localPhoneNumber}) has been successfully verified.
        </AlertDescription>
        <Button onClick={handleBackToPhoneInput} variant="link" className="mt-4 p-0 h-auto">Start Over</Button>
      </Alert>
    );
  }

  return (
    <>
      {step === "phoneNumber" && (
        <Form {...phoneForm}>
          <form action={sendCodeFormAction} className="space-y-6">
            <div className="flex space-x-2">
              <FormField
                control={phoneForm.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem className="w-1/3">
                    <FormLabel htmlFor="countryCode">Country</FormLabel>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input
                          id="countryCode"
                          type="text"
                          placeholder="+1"
                          className="pl-10"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={phoneForm.control}
                name="localPhoneNumber"
                render={({ field }) => (
                  <FormItem className="w-2/3">
                    <FormLabel htmlFor="localPhoneNumber">Phone Number</FormLabel>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input
                          id="localPhoneNumber"
                          type="tel"
                          placeholder="1234567890"
                          className="pl-10"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SubmitButton icon={<Smartphone className="mr-2 h-4 w-4" />}>Send Verification Code</SubmitButton>
          </form>
        </Form>
      )}

      {step === "verificationCode" && currentPhoneNumber && (
        <Form {...codeForm}>
           <button onClick={handleBackToPhoneInput} className="flex items-center text-sm text-primary hover:underline mb-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Change phone number
          </button>
          <p className="text-sm text-muted-foreground mb-2">
            Enter the code sent to: <strong>{currentPhoneNumber.countryCode}{currentPhoneNumber.localPhoneNumber}</strong>
          </p>
          <form
            action={(formData) => {
              formData.append("countryCode", currentPhoneNumber.countryCode);
              formData.append("localPhoneNumber", currentPhoneNumber.localPhoneNumber);
              verifyCodeFormAction(formData);
            }}
            className="space-y-6"
          >
            <FormField
              control={codeForm.control}
              name="verificationCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="verificationCode">Verification Code</FormLabel>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        id="verificationCode"
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        className="pl-10 tracking-widest text-center"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SubmitButton icon={<KeyRound className="mr-2 h-4 w-4" />}>Verify Code</SubmitButton>
          </form>
        </Form>
      )}
    </>
  );
}

    