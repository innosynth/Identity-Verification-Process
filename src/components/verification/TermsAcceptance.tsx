import { useState } from "react";
import { Shield, Eye, Lock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface TermsAcceptanceProps {
  onAcceptTerms: () => void;
  onBack: () => void;
}

export const TermsAcceptance = ({ onAcceptTerms, onBack }: TermsAcceptanceProps) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const canContinue = agreedToTerms && agreedToPrivacy;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Privacy & Terms</h2>
        <p className="text-muted-foreground">
          Please review and accept our terms to continue with identity verification
        </p>
      </div>

      {/* Privacy Information Cards */}
      <div className="grid gap-4 mb-8">
        <Card className="p-6 border-l-4 border-l-primary">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Security</h3>
              <p className="text-muted-foreground text-sm">
                Your personal information and documents are encrypted and processed securely. 
                We use bank-level security protocols to protect your data during transmission and storage.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-accent">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
              <Eye className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Usage</h3>
              <p className="text-muted-foreground text-sm">
                We only collect information necessary for identity verification. 
                Your data will not be shared with third parties without your explicit consent.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-warning">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Retention</h3>
              <p className="text-muted-foreground text-sm">
                Your verification data is retained only as long as necessary for compliance purposes. 
                You can request data deletion at any time after verification is complete.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Consent Checkboxes */}
      <Card className="p-6 mb-6">
        <div className="space-y-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
              I have read and agree to the{" "}
              <button className="text-primary hover:underline font-medium">
                Terms of Service
              </button>{" "}
              and understand that I am providing my personal information for identity verification purposes.
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="privacy"
              checked={agreedToPrivacy}
              onCheckedChange={(checked) => setAgreedToPrivacy(checked as boolean)}
              className="mt-1"
            />
            <label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
              I acknowledge that I have read the{" "}
              <button className="text-primary hover:underline font-medium">
                Privacy Policy
              </button>{" "}
              and consent to the collection, processing, and storage of my personal data as described.
            </label>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onAcceptTerms} disabled={!canContinue} className="flex-1">
          Accept & Continue
        </Button>
      </div>
      <div className="mt-4 text-center">
        <Button variant="link" onClick={() => (window as any).setShowDeviceSwitch(true)}>
          Continue on another device
        </Button>
      </div>
    </div>
  );
};