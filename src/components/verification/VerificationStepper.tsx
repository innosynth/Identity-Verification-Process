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

      {/* Desktop stepper - Vertical */}
      <div className="hidden lg:flex flex-col space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            {/* Step circle and line */}
            <div className="flex flex-col items-center mr-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                  "hover:scale-110",
                  step.status === "completed" && "bg-verification-completed text-success-foreground",
                  step.status === "active" && "bg-verification-active text-primary-foreground ring-4 ring-primary/20",
                  step.status === "inactive" && "bg-verification-inactive text-muted-foreground"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-px h-12 mt-2 transition-colors duration-300",
                  step.status === "completed" ? "bg-verification-completed" : "bg-verification-inactive"
                )} />
                )}
              </div>
              
              {/* Step labels */}
            <div className="pt-1">
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
        ))}
      </div>
    </div>
  );
};