import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface LandingPageProps {
  onStartVerification: () => void;
}

export const LandingPage = ({ onStartVerification }: LandingPageProps) => {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipientName(e.target.value);
    checkFormValidity(e.target.value, recipientEmail, uploadedDocuments.length);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipientEmail(e.target.value);
    checkFormValidity(recipientName, e.target.value, uploadedDocuments.length);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedDocuments(files);
      checkFormValidity(recipientName, recipientEmail, files.length);
    }
  };

  const checkFormValidity = (name: string, email: string, docCount: number) => {
    const emailValid = /^[^@]+@[^@]+\.[^@]+$/.test(email);
    setIsFormValid(name.trim() !== '' && emailValid && docCount > 0);
  };

  const handleStartVerification = async () => {
    if (!isFormValid) return;

    try {
      const formData = new FormData();
      formData.append('recipientName', recipientName);
      formData.append('recipientEmail', recipientEmail);
      uploadedDocuments.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      sessionStorage.setItem('recipientName', recipientName);
      sessionStorage.setItem('recipientEmail', recipientEmail);
      sessionStorage.setItem('envelopeId', result.envelopeId);
      sessionStorage.setItem('uploadedDocuments', JSON.stringify(uploadedDocuments.map(file => file.name)));
      onStartVerification();
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload documents. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-verification-bg to-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-6">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Identity Verification
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Secure, fast, and reliable identity verification in just a few simple steps. 
            Complete your verification process safely from any device.
          </p>
        </div>

        {/* CTA Section with Form */}
        <div className="text-center">
          <div className="bg-card border rounded-2xl p-8 max-w-md mx-auto shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Ready to get verified?</h2>
            <p className="text-muted-foreground mb-6">
              Have your ID document ready and ensure you're in a well-lit area for the best results.
            </p>
            <Card className="p-4 mb-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="recipientName" className="block text-sm font-medium mb-1">Recipient Name</label>
                  <Input
                    id="recipientName"
                    value={recipientName}
                    onChange={handleRecipientChange}
                    placeholder="Enter recipient's full name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="recipientEmail" className="block text-sm font-medium mb-1">Recipient Email</label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={handleEmailChange}
                    placeholder="Enter recipient's email"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="documentUpload" className="block text-sm font-medium mb-1">Upload Documents</label>
                  <Input
                    id="documentUpload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    multiple
                    onChange={handleFileUpload}
                    className="w-full"
                  />
                  {uploadedDocuments.length > 0 && (
                    <ul className="text-sm text-muted-foreground mt-2">
                      {uploadedDocuments.map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
            <Button 
              onClick={handleStartVerification}
              disabled={!isFormValid}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-primary-hover hover:shadow-lg transition-all duration-300"
            >
              Start Verification
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};