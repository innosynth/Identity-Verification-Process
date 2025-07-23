import { useState } from "react";
import { Globe, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CommandSearch } from "@/components/ui/command-search";
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

  const searchableCountries = countries.map(country => ({
    id: country.code,
    label: country.name,
    icon: country.flag,
    description: `Government-issued documents from ${country.name}`
  }));

  const handleCountrySelect = (item: any) => {
    const country = countries.find(c => c.code === item.id);
    if (country) {
      setSelectedCountry(country);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Mobile-optimized layout */}
      <div className="lg:max-w-4xl lg:mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[80vh] lg:min-h-auto">
          
          {/* Left column - Info and illustration */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6 animate-pulse-glow">
              <Globe className="w-8 h-8 text-primary animate-float" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Select Your Country
            </h1>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Choose your country of residence to continue with verification. 
              We'll use this to validate your government-issued documents.
            </p>
            
            {/* Features list */}
            <div className="hidden lg:block space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground">Secure document verification</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm text-muted-foreground">Multiple document types supported</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <span className="text-sm text-muted-foreground">Fast and reliable process</span>
              </div>
            </div>
          </div>

          {/* Right column - Form */}
          <div className="order-1 lg:order-2">
            <Card className="border-0 shadow-[var(--shadow-card)] bg-card/80 backdrop-blur-sm animate-slide-up">
              <div className="p-6 lg:p-8">
                
                {/* Country Search */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3">Country of Residence</label>
                  <CommandSearch
                    items={searchableCountries}
                    selectedId={selectedCountry?.code}
                    onSelect={handleCountrySelect}
                    placeholder="Search countries..."
                    className="w-full"
                  />
                </div>

                {/* Selected country info */}
                {selectedCountry && (
                  <div className="bg-verification-bg/50 backdrop-blur-sm p-4 rounded-lg mb-6 border border-primary/20 animate-scale-in">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                      <div>
                        <p className="font-medium text-sm mb-1">Ready to verify with {selectedCountry.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Make sure you have a valid government-issued ID from {selectedCountry.name} ready.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
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
                    onClick={() => selectedCountry && onCountrySelect(selectedCountry)}
                    disabled={!selectedCountry}
                    className="flex-1 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};