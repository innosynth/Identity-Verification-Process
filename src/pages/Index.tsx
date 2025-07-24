import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from "lucide-react";

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
  const [showDeviceSwitch, setShowDeviceSwitch] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedStep = sessionStorage.getItem("currentStep");
    const savedData = sessionStorage.getItem("verificationData");
    if (savedStep) {
      setCurrentStep(savedStep as VerificationStep);
    }
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      if (parsedData.selfieVideo) {
        // The selfie video is not stored in sessionStorage, so we don't load it.
        // The user will have to re-record the video.
        delete parsedData.selfieVideo;
      }
      setVerificationData(parsedData);
    }
  }, []);

  useEffect(() => {
    const dataToSave = { ...verificationData };
    delete dataToSave.selfieVideo; // Do not store the selfie video in sessionStorage
    sessionStorage.setItem("currentStep", currentStep);
    sessionStorage.setItem("verificationData", JSON.stringify(dataToSave));
  }, [currentStep, verificationData]);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  (window as any).setShowDeviceSwitch = setShowDeviceSwitch;

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
    sessionStorage.removeItem("currentStep");
    sessionStorage.removeItem("verificationData");
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
        <div className="lg:flex lg:gap-12">
          {/* Progress Stepper - Now on the left for large screens */}
          {currentStep !== "complete" && (
            <div className="lg:w-1/4 mb-8 lg:mb-0 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <VerificationStepper
                steps={stepsWithStatus}
                currentStep={steps.findIndex(s => getStepStatus(s.id) === "active") + 1}
              />
            </div>
          )}

          {/* Step Content */}
          <div className="lg:flex-1 animate-fade-in flex flex-col items-center justify-start pt-12" style={{ animationDelay: "0.4s" }}>
            {/* Header - Only show for non-complete steps */}
            {/* {currentStep !== "country" && currentStep !== "complete" && (
              <div className="text-center mb-8 lg:mb-12">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 animate-fade-in">
                  Identity Verification
                </h1>
                <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
                  Complete your verification in a few simple steps
                </p>
              </div>
            )} */}

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
                verificationData={verificationData}
              />
            )}
          </div>
        </div>
        <Dialog open={showDeviceSwitch} onOpenChange={setShowDeviceSwitch}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Continue on Another Device</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4">
              <p className="text-muted-foreground mb-4">
                Scan the QR code or copy the link to continue on another device.
              </p>
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={window.location.href} size={192} />
              </div>
              <div className="flex w-full mt-4">
                <Input value={window.location.href} readOnly className="flex-1" />
                <Button onClick={handleCopy} variant="ghost" className="ml-2">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedBackground>
  );
};

export default Index;