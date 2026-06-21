'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';

export type AssetItem = {
  id: string;
  url: string;
  source: 'upload' | 'generate';
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  size?: number | null;
};

export function AssetPickerDialog({
  open,
  onOpenChange,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onSelect?: (items: AssetItem[]) => void;
  accept?: 'image' | 'video';
  confirmLabel?: string;
  mediaType?: 'image' | 'video';
  selectedUrls?: string[];
  labels?: {
    title?: string;
    description?: string;
    empty?: string;
    signInRequired?: string;
    confirm?: string;
    cancel?: string;
    useSelected?: string;
    selectedCount?: string;
  };
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#101010] text-white">
        <DialogTitle>{title || 'Assets unavailable'}</DialogTitle>
        <div className="text-sm text-zinc-400">
          {description || 'The local OSS build does not include the shared asset library yet.'}
        </div>
      </DialogContent>
    </Dialog>
  );
}
