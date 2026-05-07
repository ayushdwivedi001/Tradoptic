import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Dashboard component:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-destructive/5 border border-destructive/20 rounded-2xl m-4">
          <div className="bg-destructive/10 p-4 rounded-full mb-6">
            <AlertTriangle className="text-destructive" size={48} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard Component Error</h1>
          <p className="text-muted-foreground max-w-md mb-8">
            A critical error occurred while rendering the dashboard. This may be caused by chart library compatibility issues or data formatting problems.
          </p>
          <div className="bg-background border border-border p-4 rounded-lg text-left mb-8 w-full max-w-lg overflow-auto">
            <p className="text-xs font-mono text-destructive uppercase tracking-widest mb-2 opacity-70">Error Message</p>
            <p className="text-sm font-mono text-foreground break-all">{this.state.error?.message || 'Unknown error occurred'}</p>
            {this.state.errorInfo && (
              <>
                <p className="text-xs font-mono text-destructive uppercase tracking-widest mt-4 mb-2 opacity-70">Component Stack</p>
                <p className="text-xs font-mono text-muted-foreground break-all">{this.state.errorInfo.componentStack?.split('\n').slice(0, 5).join('\n')}</p>
              </>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={this.handleReset}
              className="flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95"
            >
              <RefreshCcw size={18} />
              <span>Retry Render</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-bold border border-border hover:bg-secondary/80 transition-colors"
            >
              <Bug size={18} />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
