'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FolderOpen, Settings, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

import { exportCanvasToJson, importCanvasFromJsonFile } from '@/lib/canvas-json';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { CanvasStudioShell } from '@/shared/blocks/canvas/canvas-studio-shell';
import { DEFAULT_PROVIDER_SETTINGS, normalizeProviderSettings, providerSettingsToErrorMap } from '@/lib/provider-settings';
import type { ProviderSettings } from '@/lib/types';
import type { CanvasDocumentRecord, CanvasDocumentSummary } from '@/shared/lib/canvas/types';

const LOCAL_STORAGE_KEY = 'open-canvas/provider-settings/v1';

function readLocalSettings() {
  if (typeof window === 'undefined') {
    return DEFAULT_PROVIDER_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROVIDER_SETTINGS;
    }
    return normalizeProviderSettings(JSON.parse(raw) as Partial<ProviderSettings>);
  } catch {
    return DEFAULT_PROVIDER_SETTINGS;
  }
}

export function OpenCanvasShell({
  initialCanvas,
}: {
  initialCanvas: CanvasDocumentRecord;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<ProviderSettings>(() => readLocalSettings());
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCanvasDialogOpen, setIsCanvasDialogOpen] = useState(false);
  const [canvases, setCanvases] = useState<CanvasDocumentSummary[]>([]);
  const [isLoadingCanvases, setIsLoadingCanvases] = useState(false);
  const [isCreatingCanvas, setIsCreatingCanvas] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fieldErrors = useMemo(() => providerSettingsToErrorMap(settings), [settings]);

  useEffect(() => {
    if (!isCanvasDialogOpen) {
      return;
    }

    let cancelled = false;
    const loadCanvases = async () => {
      try {
        setIsLoadingCanvases(true);
        const response = await fetch('/api/canvas');
        const json = await response.json();
        if (!response.ok || json.code !== 0 || !json.data?.items) {
          throw new Error(json.message || 'Failed to load canvases');
        }
        if (!cancelled) {
          setCanvases(json.data.items as CanvasDocumentSummary[]);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to load canvases'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCanvases(false);
        }
      }
    };

    void loadCanvases();

    return () => {
      cancelled = true;
    };
  }, [isCanvasDialogOpen]);

  const handleChange = <K extends keyof ProviderSettings>(key: K, value: ProviderSettings[K]) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    const nextErrors = providerSettingsToErrorMap(settings);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fix the provider settings form first.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/provider-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'Failed to save provider settings');
      }

      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
      toast.success('Provider settings saved locally.');
      setIsOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save provider settings'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCanvas = async () => {
    try {
      setIsCreatingCanvas(true);
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const json = await response.json();
      if (!response.ok || json.code !== 0 || !json.data?.canvas?.id) {
        throw new Error(json.message || 'Failed to create canvas');
      }

      setIsCanvasDialogOpen(false);
      router.push(`/canvas/${json.data.canvas.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create canvas'
      );
    } finally {
      setIsCreatingCanvas(false);
    }
  };

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

      <div className="fixed bottom-5 right-5 z-[120] flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-white/10 bg-black/80 text-white backdrop-blur hover:bg-black"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          Import
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-white/10 bg-black/80 text-white backdrop-blur hover:bg-black"
          onClick={() => void handleExportCanvas()}
        >
          <Download className="size-4" />
          Export
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-white/10 bg-black/80 text-white backdrop-blur hover:bg-black"
          onClick={() => setIsCanvasDialogOpen(true)}
        >
          <FolderOpen className="size-4" />
          Canvases
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-white/10 bg-black/80 text-white backdrop-blur hover:bg-black"
          onClick={() => setIsOpen(true)}
        >
          <Settings className="size-4" />
          Providers
        </Button>
      </div>

      <Dialog open={isCanvasDialogOpen} onOpenChange={setIsCanvasDialogOpen}>
        <DialogContent className="max-w-lg border-white/10 bg-[#0f1115] text-white">
          <DialogHeader>
            <DialogTitle>Canvases</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
              <div>
                <div className="font-medium text-white">Current canvas</div>
                <div className="text-zinc-400">{initialCanvas.title}</div>
              </div>
              <Button
                type="button"
                onClick={handleCreateCanvas}
                disabled={isCreatingCanvas}
                className="bg-white text-black hover:bg-zinc-200"
              >
                {isCreatingCanvas ? 'Creating...' : 'New canvas'}
              </Button>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {isLoadingCanvases ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                  Loading canvases...
                </div>
              ) : canvases.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                  No local canvases yet.
                </div>
              ) : (
                canvases.map((canvas) => (
                  <button
                    key={canvas.id}
                    type="button"
                    onClick={() => {
                      setIsCanvasDialogOpen(false);
                      router.push(`/canvas/${canvas.id}`);
                      router.refresh();
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{canvas.title}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {canvas.preview.nodeCount} nodes
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-zinc-500">
                      {canvas.id === initialCanvas.id ? 'Open' : 'Switch'}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-transparent text-white hover:bg-white/10"
                asChild
              >
                <Link href="/canvas">Open full list</Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl border-white/10 bg-[#0f1115] text-white">
          <DialogHeader>
            <DialogTitle>Local provider settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
              The real canvas shell is running locally. Your API key and storage
              settings stay on this machine and are sent to the local API through a cookie.
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cyberbaraApiKey">Cyberbara API key</Label>
              <Input
                id="cyberbaraApiKey"
                type="password"
                value={settings.cyberbaraApiKey}
                onChange={(event) => handleChange('cyberbaraApiKey', event.target.value)}
                placeholder="sk-..."
                className="border-white/10 bg-black/40 text-white"
              />
              {fieldErrors.cyberbaraApiKey ? (
                <p className="text-xs text-red-400">{fieldErrors.cyberbaraApiKey}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cyberbaraBaseUrl">Cyberbara base URL</Label>
              <Input
                id="cyberbaraBaseUrl"
                value={settings.cyberbaraBaseUrl}
                onChange={(event) => handleChange('cyberbaraBaseUrl', event.target.value)}
                placeholder="https://cyberbara.com"
                className="border-white/10 bg-black/40 text-white"
              />
              {fieldErrors.cyberbaraBaseUrl ? (
                <p className="text-xs text-red-400">{fieldErrors.cyberbaraBaseUrl}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Upload storage</Label>
              <Select
                value={settings.storageProvider}
                onValueChange={(value) =>
                  handleChange('storageProvider', value as ProviderSettings['storageProvider'])
                }
              >
                <SelectTrigger className="border-white/10 bg-black/40 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0f1115] text-white">
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="cyberbara">Cyberbara uploads</SelectItem>
                  <SelectItem value="s3-compatible">S3-compatible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.storageProvider === 's3-compatible' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="storageS3Endpoint">S3 endpoint</Label>
                  <Input
                    id="storageS3Endpoint"
                    value={settings.storageS3Endpoint}
                    onChange={(event) =>
                      handleChange('storageS3Endpoint', event.target.value)
                    }
                    className="border-white/10 bg-black/40 text-white"
                  />
                  {fieldErrors.storageS3Endpoint ? (
                    <p className="text-xs text-red-400">{fieldErrors.storageS3Endpoint}</p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storageS3Region">Region</Label>
                  <Input
                    id="storageS3Region"
                    value={settings.storageS3Region}
                    onChange={(event) =>
                      handleChange('storageS3Region', event.target.value)
                    }
                    className="border-white/10 bg-black/40 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storageS3Bucket">Bucket</Label>
                  <Input
                    id="storageS3Bucket"
                    value={settings.storageS3Bucket}
                    onChange={(event) =>
                      handleChange('storageS3Bucket', event.target.value)
                    }
                    className="border-white/10 bg-black/40 text-white"
                  />
                  {fieldErrors.storageS3Bucket ? (
                    <p className="text-xs text-red-400">{fieldErrors.storageS3Bucket}</p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storageS3AccessKeyId">Access key</Label>
                  <Input
                    id="storageS3AccessKeyId"
                    value={settings.storageS3AccessKeyId}
                    onChange={(event) =>
                      handleChange('storageS3AccessKeyId', event.target.value)
                    }
                    className="border-white/10 bg-black/40 text-white"
                  />
                  {fieldErrors.storageS3AccessKeyId ? (
                    <p className="text-xs text-red-400">
                      {fieldErrors.storageS3AccessKeyId}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storageS3SecretAccessKey">Secret key</Label>
                  <Input
                    id="storageS3SecretAccessKey"
                    type="password"
                    value={settings.storageS3SecretAccessKey}
                    onChange={(event) =>
                      handleChange('storageS3SecretAccessKey', event.target.value)
                    }
                    className="border-white/10 bg-black/40 text-white"
                  />
                  {fieldErrors.storageS3SecretAccessKey ? (
                    <p className="text-xs text-red-400">
                      {fieldErrors.storageS3SecretAccessKey}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="storageS3PublicDomain">Public domain</Label>
                  <Input
                    id="storageS3PublicDomain"
                    value={settings.storageS3PublicDomain}
                    onChange={(event) =>
                      handleChange('storageS3PublicDomain', event.target.value)
                    }
                    placeholder="Optional"
                    className="border-white/10 bg-black/40 text-white"
                  />
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
              <FolderOpen className="mt-0.5 size-4 shrink-0" />
              <p>
                If you use local image or video uploads, save storage settings first.
                Generation itself uses the Cyberbara key.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/10"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
