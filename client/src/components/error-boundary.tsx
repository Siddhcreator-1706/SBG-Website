// @ts-nocheck
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };
  
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[400px] h-full w-full flex-col items-center justify-center p-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex w-full max-w-md flex-col items-center justify-center rounded-3xl border border-borderSoft bg-card/80 backdrop-blur-xl p-8 sm:p-10 shadow-xl"
          >
            <motion.div 
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-error/10 text-error shadow-inner rotate-3"
            >
              <AlertTriangle size={36} className="drop-shadow-sm" />
            </motion.div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-textPrimary">
              Oops! Something broke.
            </h2>
            
            <p className="mt-3 text-sm sm:text-base text-textSecondary leading-relaxed">
              We encountered an unexpected error while loading this component. Please try refreshing or return home.
            </p>
            
            {this.state.error && (
               <div className="mt-5 w-full rounded-xl bg-error/5 border border-error/10 p-3 text-left overflow-hidden">
                  <p className="text-xs font-mono text-error/80 break-words line-clamp-3">
                     {this.state.error.toString()}
                  </p>
               </div>
            )}
            
            <div className="mt-8 flex w-full flex-col sm:flex-row gap-3">
               <Button
                 className="flex-1 gap-2 h-12 rounded-xl bg-brand text-white font-bold shadow-lg shadow-brand/20 hover:shadow-xl hover:opacity-95 transition-all"
                 onClick={() => window.location.href = '/'}
               >
                 Go Home
               </Button>
               <Button
                 variant="outline"
                 className="flex-1 gap-2 h-12 rounded-xl border-borderSoft bg-card hover:bg-hoverSoft font-bold text-textPrimary transition-all"
                 onClick={this.handleRetry}
               >
                 <RefreshCw size={18} />
                 Try Again
               </Button>
            </div>
          </motion.div>
        </div>
      );
    }
    return this.props.children;
  }
}
