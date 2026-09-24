"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.fallbackCustom()) {
        return this.props.fallback;
      }

      return <DefaultFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }

  private fallbackCustom() {
    return this.props.fallback !== undefined;
  }
}

interface DefaultFallbackProps {
  error: Error | null;
  onReset: () => void;
}

const DefaultFallback: React.FC<DefaultFallbackProps> = ({ error, onReset }) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="glass-panel p-6 flex flex-col items-center justify-center text-center my-6 max-w-2xl mx-auto border-[hsl(var(--error)/0.15)] bg-neutral-950/40">
      <div className="p-3 bg-[hsl(var(--error)/0.1)] border border-[hsl(var(--error)/0.2)] text-[hsl(var(--error))] rounded-full mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      
      <h3 className="text-lg font-bold text-white mb-2">Oops! Qualcosa è andato storto</h3>
      <p className="text-sm text-neutral-400 mb-6 max-w-md">
        Si è verificato un errore imprevisto durante il rendering di questa sezione. 
        Prova a ricaricare o controlla i dettagli tecnici sotto.
      </p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={onReset}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Riprova
        </button>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn-secondary flex items-center gap-1.5"
        >
          {showDetails ? (
            <>
              <ChevronDown className="w-4 h-4" /> Nascondi Dettagli
            </>
          ) : (
            <>
              <ChevronRight className="w-4 h-4" /> Mostra Dettagli
            </>
          )}
        </button>
      </div>

      {showDetails && (
        <div className="w-full text-left bg-neutral-950 border border-neutral-900 rounded-lg p-4 font-mono text-xs text-red-400/90 overflow-auto max-h-[200px]">
          <p className="font-bold mb-1 text-red-400">{error?.name}: {error?.message}</p>
          {error?.stack && (
            <pre className="whitespace-pre-wrap opacity-75 mt-2">
              {error.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
