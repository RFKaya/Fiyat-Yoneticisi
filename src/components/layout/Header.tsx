'use client';

import { PiggyBank, Sprout, Home, Sun, Moon, Calculator, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

import { useState, useEffect } from 'react';

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full px-4 pt-4">
      <div className="glass-panel mx-auto flex h-16 items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-3">
          <PiggyBank className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            <Link href="/">FiyatVizyon</Link>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button asChild variant={pathname === '/prices' || pathname === '/' ? 'default' : 'ghost'} size="sm">
              <Link href="/prices">
                <Home className="mr-2 h-4 w-4" />
                Fiyatlar
              </Link>
            </Button>
            <Button asChild variant={pathname === '/ledger' ? 'default' : 'ghost'} size="sm">
              <Link href="/ledger">
                <PiggyBank className="mr-2 h-4 w-4" />
                Hesap Defteri
              </Link>
            </Button>
            <Button asChild variant={pathname === '/materials' ? 'default' : 'ghost'} size="sm">
              <Link href="/materials">
                <Sprout className="mr-2 h-4 w-4" />
                Malzemeler
              </Link>
            </Button>
            <Button asChild variant={pathname === '/calculator' ? 'default' : 'ghost'} size="sm">
              <Link href="/calculator">
                <Calculator className="mr-2 h-4 w-4" />
                Hesapla
              </Link>
            </Button>
            <Button asChild variant={pathname === '/orders' ? 'default' : 'ghost'} size="sm">
              <Link href="/orders">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Siparişler
              </Link>
            </Button>
          </div>
          <div className="h-6 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Temayı Değiştir"
          >
            {!mounted ? (
              <div className="h-5 w-5" />
            ) : theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
