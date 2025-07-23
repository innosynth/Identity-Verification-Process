import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
  status: "completed" | "active" | "inactive";
}

interface VerificationStepperProps {
  steps: Step[];
  currentStep: number;
}

export const VerificationStepper = ({ steps, currentStep }: VerificationStepperProps) => {
  return (
    <div className="w-full py-6">
      {/* Mobile-first responsive design */}
      <div className="block lg:hidden">
        {/* Mobile stepper - horizontal scroll */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-shrink-0">
              {/* Step circle */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  step.status === "completed" && "bg-verification-completed text-success-foreground animate-pulse-glow",
                  step.status === "active" && "bg-verification-active text-primary-foreground ring-2 ring-primary/30 animate-pulse-glow",
                  step.status === "inactive" && "bg-verification-inactive text-muted-foreground"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.id
                )}
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-px mx-2 transition-colors duration-300",
                    step.status === "completed" ? "bg-verification-completed" : "bg-verification-inactive"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        
        {/* Current step info */}
        <div className="text-center mt-4">
          <p className="text-sm font-medium text-verification-active">
            Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {steps[currentStep - 1]?.description}
          </p>
        </div>
      </div>

      {/* Desktop stepper */}
      <div className="hidden lg:flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-1">
              {/* Step circle */}
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                  "hover:scale-110",
                  step.status === "completed" && "bg-verification-completed text-success-foreground animate-pulse-glow",
                  step.status === "active" && "bg-verification-active text-primary-foreground ring-4 ring-primary/20 animate-pulse-glow",
                  step.status === "inactive" && "bg-verification-inactive text-muted-foreground"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="w-6 h-6" />
                ) : (
                  step.id
                )}
              </div>
              
              {/* Step labels */}
              <div className="mt-4 text-center">
                <p
                  className={cn(
                    "text-sm font-semibold transition-colors duration-300",
                    step.status === "active" && "text-verification-active",
                    step.status === "completed" && "text-verification-completed",
                    step.status === "inactive" && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>
            </div>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 px-6">
                <div
                  className={cn(
                    "h-px w-full transition-all duration-500",
                    step.status === "completed" 
                      ? "bg-gradient-to-r from-verification-completed to-verification-completed" 
                      : "bg-verification-inactive"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};