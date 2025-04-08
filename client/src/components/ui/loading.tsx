import { Loader2 } from "lucide-react";

interface LoadingProps {
  text?: string;
  className?: string;
}

export function Loading({ text = "Loading...", className = "" }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function FullPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loading className="py-12" />
    </div>
  );
}
