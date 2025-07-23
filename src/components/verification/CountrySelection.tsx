import { useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Country {
  code: string;
  name: string;
  flag: string;
}

const countries: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
];

interface CountrySelectionProps {
  onCountrySelect: (country: Country) => void;
  onBack: () => void;
}

export const CountrySelection = ({ onCountrySelect, onBack }: CountrySelectionProps) => {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6 border-0 shadow-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Select Your Country</h2>
          <p className="text-muted-foreground">
            Choose your country of residence to continue with verification
          </p>
        </div>

        {/* Country Dropdown */}
        <div className="relative mb-6">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-full flex items-center justify-between p-4 border border-input rounded-lg bg-background text-left",
              "hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring",
              isOpen && "border-ring ring-2 ring-ring"
            )}
          >
            <div className="flex items-center">
              {selectedCountry ? (
                <>
                  <span className="text-2xl mr-3">{selectedCountry.flag}</span>
                  <span className="font-medium">{selectedCountry.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Select a country...</span>
              )}
            </div>
            <ChevronDown className={cn("w-5 h-5 transition-transform", isOpen && "rotate-180")} />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleCountrySelect(country)}
                  className="w-full flex items-center p-3 hover:bg-muted text-left transition-colors"
                >
                  <span className="text-2xl mr-3">{country.flag}</span>
                  <span className="flex-1">{country.name}</span>
                  {selectedCountry?.code === country.code && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCountry && (
          <div className="bg-verification-bg p-4 rounded-lg mb-6">
            <p className="text-sm text-muted-foreground">
              We'll verify your identity using documents issued by {selectedCountry.name}. 
              Make sure you have a valid government-issued ID ready.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={() => selectedCountry && onCountrySelect(selectedCountry)}
            disabled={!selectedCountry}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </Card>
    </div>
  );
};