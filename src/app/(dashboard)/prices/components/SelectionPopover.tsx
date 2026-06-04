'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverTriggerButton } from '@/components/ui/icon-buttons';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { LucideIcon, PlusCircle } from 'lucide-react';

interface SelectionPopoverProps {
  label?: string;
  placeholder: string;
  triggerIcon?: LucideIcon;
  trigger?: React.ReactNode;
  items: { id: string; name: string; color?: string | null }[];
  onSelect: (id: string) => void;
  accentClass?: string;
  icon?: LucideIcon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (val: string) => void;
  align?: 'start' | 'center' | 'end';
}

export default function SelectionPopover({
  label,
  placeholder,
  triggerIcon: TriggerIcon,
  trigger,
  items,
  onSelect,
  accentClass = 'hover:bg-primary/10 hover:text-primary',
  icon: Icon,
  open,
  onOpenChange,
  search,
  onSearchChange,
  align = 'start',
}: SelectionPopoverProps) {
  // Filter items based on search query
  const filteredItems = React.useMemo(() => {
    if (!search) return items;
    const lowerSearch = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(lowerSearch));
  }, [items, search]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger || (
          <PopoverTriggerButton
            icon={TriggerIcon || PlusCircle}
            accent={accentClass.includes('indigo') ? 'indigo' : 'primary'}
          >
            {label}
          </PopoverTriggerButton>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 overflow-hidden z-[110]" align={align}>
        <div className="p-2 border-b bg-muted/30">
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 text-xs"
            autoFocus
          />
        </div>
        <ScrollArea className="h-64">
          <div className="p-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start text-xs h-9 px-2 transition-colors group ${accentClass}`}
                  onClick={() => onSelect(item.id)}
                >
                  {item.color ? (
                    <div
                      className="h-3 w-3 rounded-full mr-2 shrink-0 border border-border/30"
                      style={{ backgroundColor: item.color }}
                    />
                  ) : Icon ? (
                    <Icon className="h-3.5 w-3.5 mr-2 opacity-70 group-hover:opacity-100 shrink-0" />
                  ) : null}
                  <span className="truncate">{item.name}</span>
                </Button>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {search ? 'Sonuç bulunamadı.' : 'Eklenecek öge yok.'}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
