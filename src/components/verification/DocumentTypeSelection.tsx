import { useState } from "react";
import { CreditCard, BookOpen, FileText, Check, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DocumentType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requirements: string[];
}

const documentTypes: DocumentType[] = [
  {
    id: "drivers_license",
    name: "Driver's License",
    description: "Valid government-issued driver's license",
    icon: CreditCard,
    requirements: ["Must be current and not expired", "Clear, readable text", "All four corners visible"]
  },
  {
    id: "passport",
    name: "Passport",
    description: "Valid passport from any country",
    icon: BookOpen,
    requirements: ["Must be current and not expired", "Clear photo page", "All text must be readable"]
  },
  {
    id: "national_id",
    name: "National ID Card",
    description: "Government-issued national identity card",
    icon: FileText,
    requirements: ["Must be current and not expired", "Both front and back required", "Clear, readable text"]
  }
];

interface DocumentTypeSelectionProps {
  onDocumentTypeSelect: (docType: DocumentType) => void;
  onBack: () => void;
}

export const DocumentTypeSelection = ({ onDocumentTypeSelect, onBack }: DocumentTypeSelectionProps) => {
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);

  return (
    <div className="animate-fade-in">
      <div className="lg:max-w-6xl lg:mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8 lg:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6 animate-pulse-glow">
            <Shield className="w-8 h-8 text-primary animate-float" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Choose Document Type
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Select the type of government-issued ID you'd like to use for verification. 
            All documents are processed securely and with bank-level encryption.
          </p>
        </div>

        {/* Document Type Cards - Responsive Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {documentTypes.map((docType, index) => {
            const Icon = docType.icon;
            const isSelected = selectedType?.id === docType.id;

            return (
              <Card
                key={docType.id}
                className={cn(
                  "cursor-pointer transition-all duration-300 border-2 group hover:-translate-y-1",
                  "animate-slide-up",
                  isSelected 
                    ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg shadow-primary/20" 
                    : "border-transparent hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => setSelectedType(docType)}
              >
                <div className="p-6 lg:p-8">
                  {/* Icon and selection indicator */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                      "group-hover:scale-110",
                      isSelected 
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "bg-muted group-hover:bg-primary/10"
                    )}>
                      <Icon className="w-7 h-7" />
                    </div>
                    {isSelected && (
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-scale-in">
                        <Check className="w-5 h-5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                    {docType.name}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {docType.description}
                  </p>
                  
                  {/* Requirements */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Requirements:</p>
                    <ul className="space-y-2">
                      {docType.requirements.map((requirement, reqIndex) => (
                        <li key={reqIndex} className="text-sm text-muted-foreground flex items-center">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0" />
                          {requirement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Selected document confirmation */}
        {selectedType && (
          <Card className="max-w-2xl mx-auto p-6 bg-gradient-to-r from-verification-bg/50 to-primary/5 border border-primary/20 mb-8 animate-scale-in backdrop-blur-sm">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Perfect choice!</h4>
                <p className="text-muted-foreground mb-3">
                  You've selected <strong>{selectedType.name}</strong> for verification. 
                  Make sure your document is ready and you're in a well-lit area for the best capture quality.
                </p>
                <div className="flex items-center space-x-2 text-sm text-primary">
                  <Shield className="w-4 h-4" />
                  <span>Bank-level security and encryption</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={onBack} 
              className="flex-1 group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back
            </Button>
            <Button 
              onClick={() => selectedType && onDocumentTypeSelect(selectedType)}
              disabled={!selectedType}
              className="flex-1 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};