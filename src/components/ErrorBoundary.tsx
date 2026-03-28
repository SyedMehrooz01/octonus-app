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
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm m-4">
          <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight mb-4">Partial Data Loaded</h2>
          <p className="text-slate-500 mb-6 font-bold">Some elements could not be rendered, but your data is safe.</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl px-8 h-12 gap-2 shadow-lg shadow-blue-600/20"
          >
            <RotateCcw className="h-4 w-4" /> RETRY LOADING
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
