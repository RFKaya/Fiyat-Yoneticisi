'use client';

import React from 'react';

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export default function LoadingState({ 
  message = "Veriler Yükleniyor...", 
  fullPage = true 
}: LoadingStateProps) {
  const containerClasses = fullPage 
    ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/40 backdrop-blur-md transition-all duration-300"
    : "absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm rounded-xl transition-all duration-300";

  return (
    <div className={containerClasses}>
      <div className="relative flex flex-col items-center gap-6">
        {/* Advanced Premium Spinner */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-[3px] border-primary/10" />
          <div className="absolute inset-0 rounded-full border-[3px] border-t-primary border-r-primary/40 border-b-primary/10 border-l-primary/10 animate-spin shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
          
          {/* Inner pulsating glow */}
          <div className="absolute inset-4 rounded-full bg-primary/20 animate-pulse blur-sm" />
        </div>

        {/* Loading Text with Shimmer Effect */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-lg font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-foreground via-primary to-foreground bg-[length:200%_100%] animate-[shimmer_2s_infinite]">
            {message}
          </p>
          <div className="h-0.5 w-12 bg-primary/30 rounded-full overflow-hidden">
            <div className="h-full w-full bg-primary animate-[loading-bar_1.5s_infinite_ease-in-out]" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
