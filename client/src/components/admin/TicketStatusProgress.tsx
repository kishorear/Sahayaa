import React, { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Make sure we're using the correct interface from progress.tsx
declare module "@/components/ui/progress" {
  interface ProgressProps {
    indicator?: string;
  }
}

export type TicketStatus = "new" | "in_progress" | "resolved";

const statuses: TicketStatus[] = ["new", "in_progress", "resolved"];

interface TicketStatusProgressProps {
  status: string;
  className?: string;
  animated?: boolean;
}

export function TicketStatusProgress({
  status,
  className,
  animated = true,
}: TicketStatusProgressProps) {
  const [progress, setProgress] = useState(0);
  const currentStatus = status as TicketStatus;
  
  // Calculate the progress percentage based on status
  const calculateProgress = (): number => {
    const currentIndex = statuses.indexOf(currentStatus);
    if (currentIndex === -1) return 0;
    return Math.round(((currentIndex + 1) / statuses.length) * 100);
  };

  // Set up the animation effect
  useEffect(() => {
    // Reset progress before animating to the new value
    if (animated) {
      setProgress(0);
      const targetProgress = calculateProgress();
      
      // Don't animate if the status is not found
      if (targetProgress === 0) {
        setProgress(0);
        return;
      }
      
      // Use setTimeout to ensure the reset is rendered before animation starts
      const timer = setTimeout(() => {
        setProgress(targetProgress);
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      // If not animated, just set the progress directly
      setProgress(calculateProgress());
    }
  }, [status, animated]);

  // Color styles based on status
  const getProgressColor = () => {
    switch (currentStatus) {
      case "new":
        return "bg-red-500";
      case "in_progress":
        return "bg-yellow-500";
      case "resolved":
        return "bg-green-500";
      default:
        return "bg-primary";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {statuses.map((s, index) => (
            <Badge
              key={s}
              variant={s === currentStatus ? "default" : "outline"}
              className={cn(
                "capitalize",
                s === currentStatus && 
                (s === "new" 
                  ? "bg-red-100 text-red-800 border-red-200" 
                  : s === "in_progress" 
                    ? "bg-yellow-100 text-yellow-800 border-yellow-200" 
                    : "bg-green-100 text-green-800 border-green-200")
              )}
            >
              {s.replace("_", " ")}
            </Badge>
          ))}
        </div>
        <span className="text-sm font-medium">
          {progress}%
        </span>
      </div>
      <Progress 
        value={progress} 
        className={cn("h-2 transition-all duration-1000", className)}
        indicator={cn("transition-all duration-1000", getProgressColor())}
      />
    </div>
  );
}