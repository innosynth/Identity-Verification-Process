import { useState } from "react";
import { CheckCircle, Download, RefreshCw, Home, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { generateVerificationPdf } from "@/lib/pdfGenerator";

interface VerificationCompleteProps {
  onRestart: () => void;
  onHome: () => void;
  verificationData: any;
}

export const VerificationComplete = ({ onRestart, onHome, verificationData }: VerificationCompleteProps) => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Simulate processing
  useState(() => {
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 3000);
    return () => clearTimeout(timer);
  });

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateVerificationPdf(verificationData);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="max-w-md mx-auto text-center">
        <Card className="p-8">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6" />
          <h2 className="text-2xl font-semibold mb-2">Processing Verification</h2>
          <p className="text-muted-foreground mb-6">
            We're securely processing your documents and signature. This may take a few moments.
          </p>
          <Progress value={66} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">Analyzing documents...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-success rounded-full mb-6">
          <CheckCircle className="w-12 h-12 text-success-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-success mb-2">Verification Complete!</h1>
        <p className="text-lg text-muted-foreground">
          Your identity has been successfully verified and your documents have been digitally signed.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 mb-8">
        <Card className="p-6 border-l-4 border-l-success">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Identity Verified</h3>
              <p className="text-muted-foreground text-sm">
                Your government-issued ID has been successfully verified and authenticated.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-primary">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Document Signed</h3>
              <p className="text-muted-foreground text-sm">
                Your electronic signature has been applied to create a legally binding document.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-accent">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Ready for Download</h3>
              <p className="text-muted-foreground text-sm">
                Your signed verification document is ready to download as a secure PDF.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Download Section */}
      <Card className="p-6 mb-8 bg-gradient-to-r from-verification-bg to-background">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Download Your Signed Document</h3>
          <p className="text-muted-foreground mb-4">
            Get a copy of your verified and digitally signed identification document
          </p>
          
          {downloadProgress > 0 && downloadProgress < 100 && (
            <div className="mb-4">
              <Progress value={downloadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-1">Preparing download...</p>
            </div>
          )}
          
          <Button onClick={handleDownload} size="lg" className="w-full sm:w-auto" disabled={isGenerating}>
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating PDF..." : "Download Signed Document (PDF)"}
          </Button>
        </div>
      </Card>

      {/* Additional Information */}
      <Card className="p-6 mb-8 bg-muted/50">
        <h3 className="font-semibold mb-3">What's Next?</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Your verification is now complete and can be used for account setup or transactions</p>
          <p>• The signed document serves as proof of your identity verification</p>
          <p>• Keep a copy of the document for your records</p>
          <p>• Contact support if you need any assistance or have questions</p>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={onRestart} className="flex-1">
          <RefreshCw className="w-4 h-4 mr-2" />
          Start New Verification
        </Button>
        <Button onClick={onHome} className="flex-1">
          <Home className="w-4 h-4 mr-2" />
          Return to Home
        </Button>
      </div>
    </div>
  );
};