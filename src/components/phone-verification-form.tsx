
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sendCodeAction, verifyCodeAction } from "@/lib/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const africanCountries = [
  { name: "Algeria", code: "+213" },
  { name: "Angola", code: "+244" },
  { name: "Benin", code: "+229" },
  { name: "Botswana", code: "+267" },
  { name: "Burkina Faso", code: "+226" },
  { name: "Burundi", code: "+257" },
  { name: "Cabo Verde", code: "+238" },
  { name: "Cameroon", code: "+237" },
  { name: "Central African Republic", code: "+236" },
  { name: "Chad", code: "+235" },
  { name: "Comoros", code: "+269" },
  { name: "Congo, Dem. Rep.", code: "+243" },
  { name: "Congo, Rep.", code: "+242" },
  { name: "Cote d'Ivoire", code: "+225" },
  { name: "Djibouti", code: "+253" },
  { name: "Egypt", code: "+20" },
  { name: "Equatorial Guinea", code: "+240" },
  { name: "Eritrea", code: "+291" },
  { name: "Eswatini (fmr. Swaziland)", code: "+268" },
  { name: "Ethiopia", code: "+251" },
  { name: "Gabon", code: "+241" },
  { name: "Gambia", code: "+220" },
  { name: "Ghana", code: "+233" },
  { name: "Guinea", code: "+224" },
  { name: "Guinea-Bissau", code: "+245" },
  { name: "Kenya", code: "+254" },
  { name: "Lesotho", code: "+266" },
  { name: "Liberia", code: "+231" },
  { name: "Libya", code: "+218" },
  { name: "Madagascar", code: "+261" },
  { name: "Malawi", code: "+265" },
  { name: "Mali", code: "+223" },
  { name: "Mauritania", code: "+222" },
  { name: "Mauritius", code: "+230" },
  { name: "Morocco", code: "+212" },
  { name: "Mozambique", code: "+258" },
  { name: "Namibia", code: "+264" },
  { name: "Niger", code: "+227" },
  { name: "Nigeria", code: "+234" },
  { name: "Rwanda", code: "+250" },
  { name: "Sao Tome and Principe", code: "+239" },
  { name: "Senegal", code: "+221" },
  { name: "Seychelles", code: "+248" },
  { name: "Sierra Leone", code: "+232" },
  { name: "Somalia", code: "+252" },
  { name: "South Africa", code: "+27" },
  { name: "South Sudan", code: "+211" },
  { name: "Sudan", code: "+249" },
  { name: "Tanzania", code: "+255" },
  { name: "Togo", code: "+228" },
  { name: "Tunisia", code: "+216" },
  { name: "Uganda", code: "+256" },
  { name: "Zambia", code: "+260" },
  { name: "Zimbabwe", code: "+263" },
];


const phoneSchema = z.object({
  countryCode: z.string()
    .min(2, "Please select a country code.")
    .max(5, "Country code is too long.") // Increased max to accommodate codes like +268
    .regex(/^\+\d{1,4}$/, "Invalid country code format."), // Adjusted regex for up to 4 digits after +
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
    defaultValues: { countryCode: "+234", localPhoneNumber: "" }, // Default to Nigeria
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
    phoneForm.reset({ countryCode: "+234", localPhoneNumber: "" }); // Reset to default
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
                  <FormItem className="w-2/5"> {/* Adjusted width */}
                    <FormLabel htmlFor="countryCode">Country</FormLabel>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger id="countryCode" className="pl-10">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {africanCountries.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name} ({country.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                  <FormItem className="w-3/5"> {/* Adjusted width */}
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
