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
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-1">
              {/* Step circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                  step.status === "completed" && "bg-verification-completed text-success-foreground",
                  step.status === "active" && "bg-verification-active text-primary-foreground ring-4 ring-blue-100",
                  step.status === "inactive" && "bg-verification-inactive text-muted-foreground"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              
              {/* Step labels */}
              <div className="mt-3 text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.status === "active" && "text-verification-active",
                    step.status === "completed" && "text-verification-completed",
                    step.status === "inactive" && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
            
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-4 transition-colors duration-300",
                  step.status === "completed" ? "bg-verification-completed" : "bg-verification-inactive"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};