import { useState, useEffect } from "react";
import { VerificationStepper } from "@/components/verification/VerificationStepper";
import { LandingPage } from "@/components/verification/LandingPage";
import { CountrySelection } from "@/components/verification/CountrySelection";
import { DocumentTypeSelection } from "@/components/verification/DocumentTypeSelection";
import { TermsAcceptance } from "@/components/verification/TermsAcceptance";
import { DocumentCapture } from "@/components/verification/DocumentCapture";
import { SelfieCapture } from "@/components/verification/SelfieCapture";
import SignPdf from "./SignPdf";
import { VerificationComplete } from "@/components/verification/VerificationComplete";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from "lucide-react";
import { useParams, useLocation } from "react-router-dom";

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
  documentType?: {
    id: string;
    name: string;
    icon: string;
  };
  termsAccepted?: boolean;
  documentImages?: {
    front: string;
    back?: string;
  };
  selfieVideo?: Blob;
  signature?: { type: "drawn" | "uploaded"; data: string };
  nameVerified?: boolean;
  faceVerified?: boolean;
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
  const [recipientName, setRecipientName] = useState<string>('');
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const { id } = useParams<{ id: string }>(); // Read session ID from URL path
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // Support both ?id=...&token=... and ?sessionId=...&token=... in the URL
  let sessionId = id;
  if (!sessionId) {
    sessionId = queryParams.get('id') || queryParams.get('sessionId') || '';
  }
  const token = queryParams.get('token') || '';
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // If session id or token is missing, show a friendly message
  if (!sessionId || !token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">No Documents to Sign</h2>
          <p className="text-muted-foreground mb-6">
            Looks like you don't have any documents to sign.<br />
            Please get the URL from your admin or document creator.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (sessionId && token) {
      // Load session data based on ID
      fetch(`${API_URL}/api/signing-session/${sessionId}`, {
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'api_a44ed8187b7eefb29518361d3e2eda69'
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          const session = data.session;
          if (session) {
            sessionStorage.setItem('envelopeId', sessionId);
            sessionStorage.setItem('recipientName', session.recipient.name);
            sessionStorage.setItem('recipientEmail', session.recipient.email);
            
            // Check if user has already started verification (has saved progress)
            const savedStep = sessionStorage.getItem("currentStep");
            const hasProgress = savedStep && savedStep !== "landing";
            
            // Determine step based on session status and saved progress
            if (session.status === 'completed') {
              setCurrentStep("signature"); // Go directly to signature page which handles completed state
            } else if (session.status === 'verified') {
              setCurrentStep("signature"); // Ready for signing
            } else if (hasProgress) {
              // User has progress, continue from where they left off
              setCurrentStep(savedStep as VerificationStep);
            } else {
              // Fresh session, start verification flow
              setCurrentStep("landing");
            }
            
            // Set verification data based on session status
            if (session.status === 'completed' || session.status === 'verified') {
              setVerificationData({
                documentImages: { front: '', back: '' },
                selfieVideo: null,
                signature: { type: 'drawn', data: '' },
                nameVerified: true,
                faceVerified: true
              });
            } else {
              // For pending sessions, start with empty verification data or load saved data
              const savedData = sessionStorage.getItem("verificationData");
              if (savedData && hasProgress) {
                const parsedData = JSON.parse(savedData);
                if (parsedData.selfieVideo) {
                  delete parsedData.selfieVideo; // Don't restore video
                }
                setVerificationData(parsedData);
              } else {
                setVerificationData({});
              }
            }
          }
          setSessionLoaded(true);
        })
        .catch(error => {
          console.error('Error loading session:', error, 'Status:', error.message.includes('401') ? 'Unauthorized' : 'Other error');
          alert('Failed to load signing session. Please try again.');
          setCurrentStep("landing");
          setSessionLoaded(true);
        });
    }
  }, [sessionId, token, API_URL]);

  useEffect(() => {
    // Only load from sessionStorage if no session is being loaded from URL
    if (!sessionId || !token) {
      const savedStep = sessionStorage.getItem("currentStep");
      const savedData = sessionStorage.getItem("verificationData");
      const savedName = sessionStorage.getItem("recipientName");
      if (savedStep) {
        setCurrentStep(savedStep as VerificationStep);
      }
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.selfieVideo) {
          delete parsedData.selfieVideo;
        }
        setVerificationData(parsedData);
      }
      if (savedName) {
        setRecipientName(savedName);
      }
    }
  }, [sessionId, token]);

  useEffect(() => {
    const dataToSave = { ...verificationData };
    delete dataToSave.selfieVideo; // Do not store the selfie video in sessionStorage
    sessionStorage.setItem("currentStep", currentStep);
    sessionStorage.setItem("verificationData", JSON.stringify(dataToSave));
    sessionStorage.setItem("recipientName", recipientName);
  }, [currentStep, verificationData, recipientName]);

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
    setVerificationData(prev => ({ 
      ...prev, 
      documentType: {
        id: documentType.id,
        name: documentType.name,
        icon: 'document-icon' // Default icon value to satisfy type requirement
      }
    }));
    setCurrentStep("terms");
  };

  const handleTermsAccept = () => {
    setCurrentStep("document-capture");
  };

  const handleDocumentCapture = (images: { front: string; back?: string }) => {
    setVerificationData(prev => ({
      ...prev,
      documentImages: images,
      nameVerified: false // Reset verification status
    }));
    sessionStorage.setItem('documentFrontImage', images.front);
    setTimeout(() => {
      const nameVerified = sessionStorage.getItem('nameMatchError') !== 'true';
      setVerificationData(prev => ({
        ...prev,
        nameVerified
      }));
      if (nameVerified) {
        setCurrentStep("selfie-capture");
      } else {
        alert('Name mismatch detected. Please retry with the correct document.');
        setCurrentStep("document-capture");
      }
    }, 1000);
  };

  const handleSelfieCapture = (videoBlob: Blob) => {
    setVerificationData(prev => ({
      ...prev,
      selfieVideo: videoBlob,
      faceVerified: false // Reset verification status
    }));
    
    // Wait for face verification to complete by polling sessionStorage
    const checkFaceVerification = () => {
      const faceMatchResult = sessionStorage.getItem('faceMatchResult');
      const isProcessing = sessionStorage.getItem('faceVerificationProcessing');
      
      if (isProcessing === 'true') {
        // Still processing, check again in 500ms
        setTimeout(checkFaceVerification, 500);
        return;
      }
      
      if (faceMatchResult !== null) {
        const faceVerified = faceMatchResult === 'true';
        setVerificationData(prev => ({
          ...prev,
          faceVerified
        }));
        
        if (faceVerified && verificationData.nameVerified) {
          setCurrentStep("signature");
        } else {
          alert('Face verification failed. Please retry.');
          setCurrentStep("selfie-capture");
        }
      } else {
        // No result yet, check again
        setTimeout(checkFaceVerification, 500);
      }
    };
    
    // Start checking after a brief delay
    setTimeout(checkFaceVerification, 500);
  };

  const handleRestart = () => {
    setVerificationData({});
    setCurrentStep("landing");
    sessionStorage.removeItem("currentStep");
    sessionStorage.removeItem("verificationData");
    sessionStorage.removeItem("recipientName");
  };

  const handleBack = () => {
    const stepOrder = ["landing", "country", "document-type", "terms", "document-capture", "selfie-capture", "signature", "complete"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1] as VerificationStep);
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

            {currentStep === "document-capture" && (
              <DocumentCapture
                documentType={verificationData.documentType!}
                onCaptureComplete={handleDocumentCapture}
                onBack={handleBack}
                envelopeId={sessionId}
              />
            )}

            {currentStep === "selfie-capture" && (
              <SelfieCapture
                onCaptureComplete={handleSelfieCapture}
                onBack={handleBack}
                envelopeId={sessionId}
              />
            )}

            {currentStep === "signature" && (
              <SignPdf id={sessionId} token={token} onBack={handleBack} onComplete={() => setCurrentStep("complete")} />
            )}

            {currentStep === "complete" && (
              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl bg-white/90 rounded-2xl shadow-2xl p-8 border border-blue-100 animate-fade-in mt-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-green-600 mb-2">Process Complete!</h1>
                  <p className="text-gray-600 mb-6">
                    Your document has been successfully signed and is ready for download.
                  </p>
                  <Button onClick={handleRestart} variant="outline" className="px-6 py-2">
                    Start New Session
                  </Button>
                </div>
              </div>
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