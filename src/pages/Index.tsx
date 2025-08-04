import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const { id } = useParams<{ id: string }>(); // Read session ID from URL path
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token') || '';
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (id && token) {
      // Load session data based on ID
      fetch(`${API_URL}/api/signing-session/${id}`, {
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
            sessionStorage.setItem('envelopeId', id);
            sessionStorage.setItem('recipientName', session.recipient.name);
            sessionStorage.setItem('recipientEmail', session.recipient.email);
            setCurrentStep("landing"); // Start at the first step of the verification flow
            // Set default verification data to prevent undefined errors
            setVerificationData({
              documentImages: { front: '', back: '' },
              selfieVideo: null,
              signature: { type: 'drawn', data: '' },
              nameVerified: session.status === 'verified',
              faceVerified: session.status === 'verified'
            });
          }
        })
        .catch(error => {
          console.error('Error loading session:', error, 'Status:', error.message.includes('401') ? 'Unauthorized' : 'Other error');
          alert('Failed to load signing session. Please try again.');
          setCurrentStep("landing");
        });
    }
  }, [id, token, API_URL]);

  useEffect(() => {
    const savedStep = sessionStorage.getItem("currentStep");
    const savedData = sessionStorage.getItem("verificationData");
    const savedName = sessionStorage.getItem("recipientName");
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
    if (savedName) {
      setRecipientName(savedName);
    }
  }, []);

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
    // Store document image for face matching later
    sessionStorage.setItem('documentFrontImage', images.front);
    // Check name verification status from session storage (updated by DocumentCapture component)
    setTimeout(async () => {
      const nameVerified = sessionStorage.getItem('nameMatchError') !== 'true';
      setVerificationData(prev => ({
        ...prev,
        nameVerified
      }));
      if (nameVerified) {
        // Update verification status in backend
        const envelopeId = sessionStorage.getItem('envelopeId');
        if (envelopeId) {
          try {
            const response = await fetch(`${API_URL}/api/envelope/${envelopeId}/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ nameVerified, faceVerified: false }),
            });
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            console.log('Verification status updated:', result);
          } catch (error) {
            console.error('Error updating verification status:', error);
          }
        }
        setCurrentStep("selfie-capture");
      } else {
        alert('Name mismatch detected. Please retry with the correct document.');
        setCurrentStep("document-capture"); // Restart document capture
      }
    }, 1000); // Delay to simulate processing
  };

  const handleSelfieCapture = (videoBlob: Blob) => {
    setVerificationData(prev => ({
      ...prev,
      selfieVideo: videoBlob,
      faceVerified: false // Reset verification status
    }));
    // Check face verification status from session storage (updated by SelfieCapture component)
    setTimeout(async () => {
      const faceVerified = sessionStorage.getItem('faceMatchResult') === 'true';
      setVerificationData(prev => ({
        ...prev,
        faceVerified
      }));
      if (faceVerified && verificationData.nameVerified) {
        // Update verification status in backend
        const envelopeId = sessionStorage.getItem('envelopeId');
        if (envelopeId) {
          try {
            const response = await fetch(`${API_URL}/api/envelope/${envelopeId}/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ nameVerified: verificationData.nameVerified, faceVerified }),
            });
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            console.log('Verification status updated:', result);
            if (result.status === 'verified') {
              createEnvelope(); // Keep frontend envelope creation for now
              // Prepare envelope for signing
              const prepareResponse = await fetch(`${API_URL}/api/envelope/${envelopeId}/prepare`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              if (!prepareResponse.ok) {
                throw new Error(`HTTP error preparing envelope! status: ${prepareResponse.status}`);
              }
              const prepareResult = await prepareResponse.json();
              console.log('Envelope prepared for signing:', prepareResult);
              setCurrentStep("signature");
            } else {
              throw new Error('Verification status not updated to verified');
            }
          } catch (error) {
            console.error('Error updating verification status:', error);
            alert('Failed to update verification status. Please retry.');
            setCurrentStep("selfie-capture");
          }
        } else {
          alert('No envelope ID found. Please restart the process.');
          setCurrentStep("landing");
        }
      } else {
        alert('Face verification failed. Please retry.');
        setCurrentStep("selfie-capture"); // Restart selfie capture
      }
    }, 1000); // Delay to simulate processing
  };

  const createEnvelope = () => {
    const uploadedDocs = sessionStorage.getItem('uploadedDocuments');
    if (uploadedDocs) {
      const documents = JSON.parse(uploadedDocs);
      const envelope = {
        id: `ENV-${Date.now()}`,
        documents,
        recipientName: sessionStorage.getItem('recipientName') || 'Unknown',
        recipientEmail: sessionStorage.getItem('recipientEmail') || 'Unknown',
        status: 'pending'
      };
      sessionStorage.setItem('envelope', JSON.stringify(envelope));
      console.log('Envelope created:', envelope);
    } else {
      console.error('No uploaded documents found for envelope creation');
    }
  };

  const handleSignatureComplete = (signature: { type: "drawn" | "uploaded"; data: string }) => {
    setVerificationData(prev => ({ ...prev, signature }));
    // Update envelope status to signed
    const envelopeId = sessionStorage.getItem('envelopeId');
    if (envelopeId) {
      fetch(`${API_URL}/api/envelope/${envelopeId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'signed',
          signatureType: signature.type,
          signatureData: signature.data
        }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(result => {
          console.log('Envelope status updated to signed:', result);
          setCurrentStep("complete");
        })
        .catch(error => {
          console.error('Error updating envelope status:', error);
          alert('Failed to update signing status. Please try again.');
        });
    } else {
      alert('No envelope ID found. Please restart the process.');
      setCurrentStep("landing");
    }
  };

  const handleSignLaterOrDecline = (reason: 'later' | 'decline') => {
    // Simulate DocuSign 'signing incomplete' event
    const envelopeId = sessionStorage.getItem('envelopeId');
    if (envelopeId) {
      fetch(`${API_URL}/api/envelope/${envelopeId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: reason === 'later' ? 'pending_later' : 'declined'
        }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(result => {
          console.log(`Envelope status updated to ${result.status}:`, result);
          alert(reason === 'later' ? 'You have chosen to sign later. You will need to restart the process.' : 'You have declined to sign. You will need to restart the process.');
          // Redirect to an earlier step or notify the application (simulated here by resetting to landing)
          setCurrentStep("landing");
          // Clear some session data to simulate a reset, but keep recipient info
          const recipientName = sessionStorage.getItem('recipientName');
          const recipientEmail = sessionStorage.getItem('recipientEmail');
          const uploadedDocuments = sessionStorage.getItem('uploadedDocuments');
          sessionStorage.clear();
          if (recipientName) sessionStorage.setItem('recipientName', recipientName);
          if (recipientEmail) sessionStorage.setItem('recipientEmail', recipientEmail);
          if (uploadedDocuments) sessionStorage.setItem('uploadedDocuments', uploadedDocuments);
          setVerificationData({});
        })
        .catch(error => {
          console.error('Error updating envelope status:', error);
          alert('Failed to update status. Please try again.');
          setCurrentStep("signature");
        });
    } else {
      alert('No envelope ID found. Please restart the process.');
      setCurrentStep("landing");
      // Clear some session data to simulate a reset, but keep recipient info
      const recipientName = sessionStorage.getItem('recipientName');
      const recipientEmail = sessionStorage.getItem('recipientEmail');
      const uploadedDocuments = sessionStorage.getItem('uploadedDocuments');
      sessionStorage.clear();
      if (recipientName) sessionStorage.setItem('recipientName', recipientName);
      if (recipientEmail) sessionStorage.setItem('recipientEmail', recipientEmail);
      if (uploadedDocuments) sessionStorage.setItem('uploadedDocuments', uploadedDocuments);
      setVerificationData({});
    }
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
                onSignLater={() => handleSignLaterOrDecline('later')}
                onDecline={() => handleSignLaterOrDecline('decline')}
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