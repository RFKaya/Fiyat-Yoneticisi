'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';

export default function AuthWrapper({ isAuthenticated, children }: { isAuthenticated: boolean, children: React.ReactNode }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        router.refresh();
      } else {
        setError(data.message || 'Giriş başarısız');
        setPassword('');
      }
    } catch (err) {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-panel border-none shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Lock size={200} />
        </div>
        <CardHeader className="text-center relative z-10 pb-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Lock className="text-primary w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Sisteme Giriş</CardTitle>
          <CardDescription className="text-base mt-2">
            Verilere erişmek için şifrenizi girin
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Şifreniz"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="h-12 text-center text-lg tracking-widest bg-background/50 border-primary/20 focus-visible:ring-primary/50"
              />
            </div>
            {error && (
              <div className="text-destructive text-sm font-medium text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold transition-all" 
              disabled={loading || !password}
            >
              {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
