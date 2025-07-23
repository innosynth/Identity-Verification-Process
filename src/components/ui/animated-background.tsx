import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  variant?: "default" | "mesh" | "radial";
  className?: string;
}

export const AnimatedBackground = ({ 
  children, 
  variant = "default",
  className 
}: AnimatedBackgroundProps) => {
  const getBackgroundStyle = () => {
    switch (variant) {
      case "mesh":
        return "bg-[image:var(--gradient-mesh)]";
      case "radial":
        return "bg-[image:var(--gradient-radial)]";
      default:
        return "bg-gradient-to-br from-verification-bg to-background";
    }
  };

  return (
    <div className={cn(
      "relative min-h-screen overflow-hidden",
      getBackgroundStyle(),
      className
    )}>
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float" 
             style={{ animationDelay: "0s" }} />
        <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-xl animate-float" 
             style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-3/4 w-24 h-24 bg-warning/10 rounded-full blur-xl animate-float" 
             style={{ animationDelay: "4s" }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};