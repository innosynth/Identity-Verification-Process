import { useState } from "react";
import { VerificationStepper } from "@/components/verification/VerificationStepper";
import { LandingPage } from "@/components/verification/LandingPage";
import { CountrySelection } from "@/components/verification/CountrySelection";
import { DocumentTypeSelection } from "@/components/verification/DocumentTypeSelection";
import { TermsAcceptance } from "@/components/verification/TermsAcceptance";
import { DocumentCapture } from "@/components/verification/DocumentCapture";
import { SelfieCapture } from "@/components/verification/SelfieCapture";
import { ESignature } from "@/components/verification/ESignature";
import { VerificationComplete } from "@/components/verification/VerificationComplete";
import { AnimatedBackground } from "@/components/ui/animated-background";

type VerificationStep = 
  | "landing"
  | "country"
  | "document-type"
  | "terms"
  | "document-capture"
  | "selfie-capture"
  | "signature"
  | "complete";

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  requirements: string[];
}

interface VerificationData {
  country?: Country;
  documentType?: DocumentType;
  documentImages?: { front: string; back?: string };
  selfieVideo?: Blob;
  signature?: { type: "drawn" | "uploaded"; data: string };
}

const steps = [
  { id: 1, title: "Country", description: "Select country" },
  { id: 2, title: "Document", description: "Choose ID type" },
  { id: 3, title: "Terms", description: "Accept terms" },
  { id: 4, title: "Capture", description: "Scan document" },
  { id: 5, title: "Selfie", description: "Record video" },
  { id: 6, title: "Sign", description: "E-signature" },
  { id: 7, title: "Complete", description: "Finished" },
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState<VerificationStep>("landing");
  const [verificationData, setVerificationData] = useState<VerificationData>({});

  const getStepStatus = (stepId: number): "completed" | "active" | "inactive" => {
    const stepMap: Record<VerificationStep, number> = {
      "landing": 0,
      "country": 1,
      "document-type": 2,
      "terms": 3,
      "document-capture": 4,
      "selfie-capture": 5,
      "signature": 6,
      "complete": 7,
    };

    const currentStepNumber = stepMap[currentStep];
    
    if (stepId < currentStepNumber) return "completed";
    if (stepId === currentStepNumber) return "active";
    return "inactive";
  };

  const stepsWithStatus = steps.map(step => ({
    ...step,
    status: getStepStatus(step.id)
  }));

  const handleStartVerification = () => {
    setCurrentStep("country");
  };

  const handleCountrySelect = (country: Country) => {
    setVerificationData(prev => ({ ...prev, country }));
    setCurrentStep("document-type");
  };

  const handleDocumentTypeSelect = (documentType: DocumentType) => {
    setVerificationData(prev => ({ ...prev, documentType }));
    setCurrentStep("terms");
  };

  const handleTermsAccept = () => {
    setCurrentStep("document-capture");
  };

  const handleDocumentCapture = (images: { front: string; back?: string }) => {
    setVerificationData(prev => ({ ...prev, documentImages: images }));
    setCurrentStep("selfie-capture");
  };

  const handleSelfieCapture = (videoBlob: Blob) => {
    setVerificationData(prev => ({ ...prev, selfieVideo: videoBlob }));
    setCurrentStep("signature");
  };

  const handleSignatureComplete = (signature: { type: "drawn" | "uploaded"; data: string }) => {
    setVerificationData(prev => ({ ...prev, signature }));
    setCurrentStep("complete");
  };

  const handleRestart = () => {
    setVerificationData({});
    setCurrentStep("landing");
  };

  const handleBack = () => {
    switch (currentStep) {
      case "country":
        setCurrentStep("landing");
        break;
      case "document-type":
        setCurrentStep("country");
        break;
      case "terms":
        setCurrentStep("document-type");
        break;
      case "document-capture":
        setCurrentStep("terms");
        break;
      case "selfie-capture":
        setCurrentStep("document-capture");
        break;
      case "signature":
        setCurrentStep("selfie-capture");
        break;
      default:
        break;
    }
  };

  if (currentStep === "landing") {
    return <LandingPage onStartVerification={handleStartVerification} />;
  }

  return (
    <AnimatedBackground variant="mesh">
      <div className="container mx-auto px-4 py-6 lg:py-12">
        {/* Header - Only show for non-complete steps */}
        {currentStep !== "complete" && (
          <div className="text-center mb-8 lg:mb-12">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 animate-fade-in">
              Identity Verification
            </h1>
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Complete your verification in a few simple steps
            </p>
          </div>
        )}

        {/* Progress Stepper - Mobile optimized */}
        {currentStep !== "complete" && (
          <div className="mb-8 lg:mb-12 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <VerificationStepper 
              steps={stepsWithStatus} 
              currentStep={steps.findIndex(s => getStepStatus(s.id) === "active") + 1} 
            />
          </div>
        )}

        {/* Step Content */}
        <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          {currentStep === "country" && (
            <CountrySelection 
              onCountrySelect={handleCountrySelect}
              onBack={handleBack}
            />
          )}

          {currentStep === "document-type" && (
            <DocumentTypeSelection 
              onDocumentTypeSelect={handleDocumentTypeSelect}
              onBack={handleBack}
            />
          )}

          {currentStep === "terms" && (
            <TermsAcceptance 
              onAcceptTerms={handleTermsAccept}
              onBack={handleBack}
            />
          )}

          {currentStep === "document-capture" && verificationData.documentType && (
            <DocumentCapture 
              documentType={verificationData.documentType}
              onCaptureComplete={handleDocumentCapture}
              onBack={handleBack}
            />
          )}

          {currentStep === "selfie-capture" && (
            <SelfieCapture 
              onCaptureComplete={handleSelfieCapture}
              onBack={handleBack}
            />
          )}

          {currentStep === "signature" && (
            <ESignature 
              onSignatureComplete={handleSignatureComplete}
              onBack={handleBack}
            />
          )}

          {currentStep === "complete" && (
            <VerificationComplete 
              onRestart={handleRestart}
              onHome={handleRestart}
            />
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
};

export default Index;