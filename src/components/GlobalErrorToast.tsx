'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function GlobalErrorToast() {
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      const handleFetchError = (e: CustomEvent) => {
         setError(e.detail || 'Sunucuyla iletişim kurulurken bir hata oluştu');
         
         // 6 saniye sonra otomatik kapan
         setTimeout(() => {
            setError(null);
         }, 6000);
      };
      
      window.addEventListener('app-fetch-error', handleFetchError as EventListener);
      return () => window.removeEventListener('app-fetch-error', handleFetchError as EventListener);
   }, []);

   if (!error) return null;

   return (
      <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
         <div className="bg-destructive/95 backdrop-blur-md text-destructive-foreground px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-destructive-foreground/20 max-w-sm">
             <AlertCircle className="w-6 h-6 flex-shrink-0" />
             <div className="flex flex-col">
                 <span className="font-bold text-sm">Hata Oluştu</span>
                 <span className="text-sm opacity-90">{error}</span>
             </div>
             <button 
                onClick={() => setError(null)} 
                className="ml-auto opacity-70 hover:opacity-100 transition-opacity bg-destructive-foreground/10 p-1 rounded-md"
             >
               <X className="w-4 h-4" />
             </button>
         </div>
      </div>
   );
}
