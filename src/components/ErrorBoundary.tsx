import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Silent error reporting in production
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-destructive/5 rounded-3xl border border-destructive/20 animate-in fade-in duration-500">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tight">Something went wrong</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto font-medium">
            An unexpected error occurred while loading this section. Our team has been notified.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="rounded-xl font-bold gap-2 h-12 px-8 shadow-lg shadow-primary/20"
          >
            <RotateCcw className="h-4 w-4" /> Reload Page
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-black/5 rounded-xl text-left text-xs overflow-auto max-w-full font-mono text-destructive">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
