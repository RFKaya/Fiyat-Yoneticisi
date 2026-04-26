'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatusType = 'idle' | 'waiting' | 'saving' | 'saved' | 'error';

interface SaveStatusProps {
  status: SaveStatusType;
  className?: string;
}

export function SaveStatus({ status, className }: SaveStatusProps) {
  if (status === 'idle') return null;

  const configs = {
    waiting: {
      label: '🕒 Kayıt Bekliyor...',
      class: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: <Clock className="h-3 w-3" />
    },
    saving: {
      label: '🔄 Kaydediliyor...',
      class: 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse',
      icon: <Loader2 className="h-3 w-3 animate-spin" />
    },
    saved: {
      label: '✅ Kaydedildi',
      class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: <CheckCircle2 className="h-3 w-3" />
    },
    error: {
      label: '❌ Kayıt Hatası!',
      class: 'bg-destructive/10 text-destructive border-destructive/20',
      icon: <AlertCircle className="h-3 w-3" />
    }
  };

  const config = configs[status as keyof typeof configs];
  if (!config) return null;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all duration-300",
      config.class,
      className
    )}>
      {config.icon}
      {config.label}
    </div>
  );
}
