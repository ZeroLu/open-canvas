'use client';

import { useRef } from 'react';
import { Download, FileJson, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { exportCanvasToJson, importCanvasFromJsonFile } from '@/lib/canvas-json';
import { CanvasStudioShell } from '@/shared/blocks/canvas/canvas-studio-shell';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import type { CanvasDocumentRecord } from '@/shared/lib/canvas/types';

export function OpenCanvasShell({
  initialCanvas,
}: {
  initialCanvas: CanvasDocumentRecord;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportCanvas = async () => {
    try {
      await exportCanvasToJson(initialCanvas.id);
      toast.success('Canvas exported as JSON.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to export canvas'
      );
    }
  };

  const handleImportCanvas = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      const result = await importCanvasFromJsonFile(file);
      toast.success(`Imported "${result.title}".`);
      router.push(`/canvas/${result.canvasId}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to import canvas JSON'
      );
    }
  };

  return (
    <>
      <CanvasStudioShell initialCanvas={initialCanvas} />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportCanvas}
      />

      <div className="fixed left-4 top-4 z-[120]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-black/80 text-white backdrop-blur hover:bg-black"
            >
              <FileJson className="size-4" />
              File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="border-white/10 bg-[#121212] text-white"
          >
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Import JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleExportCanvas()}>
              <Download className="size-4" />
              Export JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
