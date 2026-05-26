/**
 * Shared button components.
 *
 * These wrap the base <Button> with the recurring visual patterns used
 * across the prices page so that styles are defined in one place.
 *
 * Icon-only buttons:
 *   <DeleteIconButton onClick={...} />
 *   <EditIconButton   onClick={...} />
 *   <DragHandleButton {...attributes} {...listeners} />
 *   <ExpandToggleButton isOpen={isOpen} />
 *
 * Action buttons:
 *   <AddRowButton>Kaynak Ekle</AddRowButton>
 *   <PopoverTriggerButton icon={PlusCircle}>Malzeme</PopoverTriggerButton>
 *   <PopoverTriggerButton icon={Package} accent="indigo">Ürün</PopoverTriggerButton>
 *   <CancelRowButton onClick={...} />
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, Edit, GripVertical, ChevronDown, ChevronUp, PlusCircle, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// DeleteIconButton
// ---------------------------------------------------------------------------
interface DeleteIconButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  /** Button size: 'sm' = h-7 w-7, 'md' = h-8 w-8 (default), 'lg' = h-9 w-9 */
  buttonSize?: 'sm' | 'md' | 'lg';
}

export const DeleteIconButton = React.forwardRef<HTMLButtonElement, DeleteIconButtonProps>(
  ({ buttonSize = 'md', className, ...props }, ref) => {
    const sizeClass =
      buttonSize === 'sm' ? 'h-7 w-7' : buttonSize === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(
          sizeClass,
          'text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg',
          className,
        )}
        {...props}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  },
);
DeleteIconButton.displayName = 'DeleteIconButton';

// ---------------------------------------------------------------------------
// EditIconButton
// ---------------------------------------------------------------------------
interface EditIconButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  buttonSize?: 'sm' | 'md' | 'lg';
}

export const EditIconButton = React.forwardRef<HTMLButtonElement, EditIconButtonProps>(
  ({ buttonSize = 'md', className, ...props }, ref) => {
    const sizeClass =
      buttonSize === 'sm' ? 'h-7 w-7' : buttonSize === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(
          sizeClass,
          'text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors rounded-lg',
          className,
        )}
        {...props}
      >
        <Edit className="h-4 w-4" />
      </Button>
    );
  },
);
EditIconButton.displayName = 'EditIconButton';

// ---------------------------------------------------------------------------
// DragHandleButton
// ---------------------------------------------------------------------------
interface DragHandleButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  buttonSize?: 'sm' | 'md' | 'lg';
}

export const DragHandleButton = React.forwardRef<HTMLButtonElement, DragHandleButtonProps>(
  ({ buttonSize = 'md', className, ...props }, ref) => {
    const sizeClass =
      buttonSize === 'sm' ? 'h-7 w-7' : buttonSize === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(sizeClass, 'cursor-grab text-muted-foreground/50 hover:text-primary transition-colors', className)}
        {...props}
      >
        <GripVertical className="h-5 w-5" />
      </Button>
    );
  },
);
DragHandleButton.displayName = 'DragHandleButton';

// ---------------------------------------------------------------------------
// ExpandToggleButton
// ---------------------------------------------------------------------------
interface ExpandToggleButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  isOpen: boolean;
  buttonSize?: 'sm' | 'md' | 'lg';
}

export const ExpandToggleButton = React.forwardRef<HTMLButtonElement, ExpandToggleButtonProps>(
  ({ isOpen, buttonSize = 'md', className, ...props }, ref) => {
    const sizeClass =
      buttonSize === 'sm' ? 'h-7 w-7' : buttonSize === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(sizeClass, 'hover:bg-muted transition-colors rounded-lg', className)}
        {...props}
      >
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </Button>
    );
  },
);
ExpandToggleButton.displayName = 'ExpandToggleButton';

// ---------------------------------------------------------------------------
// AddRowButton  — kesik kenarlı, tam genişlikte "satır ekle" butonu
// ---------------------------------------------------------------------------
export const AddRowButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, children, ...props }, ref) => (
  <Button
    ref={ref}
    variant="outline"
    size="sm"
    className={cn(
      'w-full border-dashed h-9',
      'text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/30',
      'bg-transparent transition-colors',
      className,
    )}
    {...props}
  >
    <PlusCircle className="mr-2 h-4 w-4 shrink-0" />
    {children}
  </Button>
));
AddRowButton.displayName = 'AddRowButton';

// ---------------------------------------------------------------------------
// PopoverTriggerButton  — Popover tetikleyici, primary veya indigo aksanlı
// ---------------------------------------------------------------------------
interface PopoverTriggerButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  /** İkon bileşeni (örn. PlusCircle, Package) */
  icon: React.ElementType;
  /** Renk tonu: 'primary' (varsayılan) veya 'indigo' */
  accent?: 'primary' | 'indigo';
}

export const PopoverTriggerButton = React.forwardRef<HTMLButtonElement, PopoverTriggerButtonProps>(
  ({ icon: Icon, accent = 'primary', className, children, ...props }, ref) => {
    const accentClass =
      accent === 'indigo'
        ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300'
        : 'hover:bg-primary/10 hover:text-primary';
    return (
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        className={cn(accentClass, className)}
        {...props}
      >
        <Icon className="mr-2 h-4 w-4 shrink-0" />
        {children}
      </Button>
    );
  },
);
PopoverTriggerButton.displayName = 'PopoverTriggerButton';

// ---------------------------------------------------------------------------
// CancelRowButton  — satır içi iptal (X simgesi, ghost küçük)
// ---------------------------------------------------------------------------
export const CancelRowButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    size="sm"
    variant="ghost"
    className={cn('h-8 shrink-0', className)}
    {...props}
  >
    <X className="h-4 w-4" />
  </Button>
));
CancelRowButton.displayName = 'CancelRowButton';
