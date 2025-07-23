import { Shield, Smartphone, Clock, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LandingPageProps {
  onStartVerification: () => void;
}

export const LandingPage = ({ onStartVerification }: LandingPageProps) => {
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

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="p-6 text-center border-0 shadow-md hover:shadow-lg transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Mobile Optimized</h3>
            <p className="text-muted-foreground">
              Seamlessly works on any device with camera access for document and selfie capture.
            </p>
          </Card>

          <Card className="p-6 text-center border-0 shadow-md hover:shadow-lg transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full mb-4">
              <Clock className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Quick Process</h3>
            <p className="text-muted-foreground">
              Complete verification in under 5 minutes with our streamlined process.
            </p>
          </Card>

          <Card className="p-6 text-center border-0 shadow-md hover:shadow-lg transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-success/10 rounded-full mb-4">
              <FileCheck className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure & Compliant</h3>
            <p className="text-muted-foreground">
              Bank-level security with encrypted uploads and compliance with privacy regulations.
            </p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-card border rounded-2xl p-8 max-w-md mx-auto shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Ready to get verified?</h2>
            <p className="text-muted-foreground mb-6">
              Have your ID document ready and ensure you're in a well-lit area for the best results.
            </p>
            <Button 
              onClick={onStartVerification}
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