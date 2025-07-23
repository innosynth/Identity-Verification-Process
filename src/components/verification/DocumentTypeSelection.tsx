import { useState } from "react";
import { CreditCard, BookOpen, FileText, Check } from "lucide-react";
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
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Choose Document Type</h2>
        <p className="text-muted-foreground">
          Select the type of government-issued ID you'd like to use for verification
        </p>
      </div>

      {/* Document Type Cards */}
      <div className="grid gap-4 mb-8">
        {documentTypes.map((docType) => {
          const Icon = docType.icon;
          const isSelected = selectedType?.id === docType.id;

          return (
            <Card
              key={docType.id}
              className={cn(
                "p-6 cursor-pointer transition-all duration-200 border-2",
                isSelected 
                  ? "border-primary bg-primary/5 shadow-md" 
                  : "border-transparent hover:border-border hover:shadow-sm"
              )}
              onClick={() => setSelectedType(docType)}
            >
              <div className="flex items-start space-x-4">
                <div className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{docType.name}</h3>
                    {isSelected && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-3">{docType.description}</p>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Requirements:</p>
                    <ul className="space-y-1">
                      {docType.requirements.map((requirement, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full mr-2 flex-shrink-0" />
                          {requirement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedType && (
        <Card className="p-4 bg-verification-bg border-primary/20 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Good choice!</p>
              <p className="text-sm text-muted-foreground">
                Make sure your {selectedType.name.toLowerCase()} is ready and you're in a well-lit area for the best capture quality.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={() => selectedType && onDocumentTypeSelect(selectedType)}
          disabled={!selectedType}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};