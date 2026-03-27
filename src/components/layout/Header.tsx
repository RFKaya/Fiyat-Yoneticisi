import { PiggyBank, Sprout, Home, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

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
            <Button asChild variant={pathname === '/' ? 'default' : 'ghost'} size="sm">
              <Link href="/">
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
          </div>
          <div className="h-6 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Temayı Değiştir"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
