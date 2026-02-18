import { PiggyBank, Sprout } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <PiggyBank className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            <Link href="/">FiyatVizyon</Link>
          </h1>
        </div>
        <div className="flex items-center gap-2">
            <Button asChild variant="outline">
                <Link href="/materials">
                    <Sprout className="mr-2 h-4 w-4" />
                    Malzemeler
                </Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
