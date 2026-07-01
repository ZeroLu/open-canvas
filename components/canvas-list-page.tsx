'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Clock3,
  FilePenLine,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
  Type,
  Upload,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';

import { importCanvasFromJsonFile } from '@/lib/canvas-json';
import { Link, useRouter } from '@/i18n/navigation';
import { LazyVideo } from '@/shared/blocks/common/lazy-video';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { getMediaDisplayUrl } from '@/shared/lib/media-url';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import {
  ONBOARDING_LOCAL_STORAGE_KEY,
  OnboardingWizard,
  ProviderSettingsDialog,
  readProviderSettingsFromLocalStorage,
} from '@/components/provider-settings-dialog';
import type {
  CanvasDocumentSummary,
  CanvasPreviewSummary,
} from '@/shared/lib/canvas/types';
import {
  canvasT,
  localizeCanvasTitle,
} from '@/shared/lib/canvas/i18n';
import { useCanvasTranslations } from '@/shared/lib/canvas/use-canvas-translations';

function formatRelativeDate(
  value: string | null,
  t: ReturnType<typeof useCanvasTranslations>,
  locale: string
) {
  if (!value) {
    return canvasT(t, 'list.justNow');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return canvasT(t, 'list.justNow');
  }

  const diffMs = Date.now() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) {
    return canvasT(t, 'list.justNow');
  }

  if (diffMs < hourMs) {
    return canvasT(t, 'list.minutesAgo', {
      count: Math.max(1, Math.floor(diffMs / minuteMs)),
    });
  }

  if (diffMs < dayMs) {
    return canvasT(t, 'list.hoursAgo', {
      count: Math.max(1, Math.floor(diffMs / hourMs)),
    });
  }

  return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en', {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

function renderCanvasHero(canvas: {
  title: string;
  preview: CanvasPreviewSummary;
}, t: ReturnType<typeof useCanvasTranslations>) {
  if (
    canvas.preview.heroMedia?.url &&
    canvas.preview.heroNodeType === 'image'
  ) {
    return (
      <img
        src={getMediaDisplayUrl(
          canvas.preview.heroMedia.thumbnailUrl || canvas.preview.heroMedia.url
        )}
        alt={canvas.preview.heroTitle || canvas.title}
        className="h-full w-full object-cover"
      />
    );
  }

  if (
    canvas.preview.heroMedia?.url &&
    canvas.preview.heroNodeType === 'video'
  ) {
    return (
      <LazyVideo
        src={getMediaDisplayUrl(canvas.preview.heroMedia.url)}
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    );
  }

  if (canvas.preview.textSnippet) {
    return (
      <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_55%),linear-gradient(180deg,#171717_0%,#070707_100%)] p-5 text-white">
        <Type className="size-5 text-white/45" />
        <p className="line-clamp-4 text-sm leading-6 text-white/75">
          {canvas.preview.textSnippet}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_55%),linear-gradient(180deg,#171717_0%,#070707_100%)] p-5 text-white">
      <Workflow className="size-5 text-white/45" />
      <div className="space-y-2">
        <p className="text-sm font-medium text-white/85">{canvas.title}</p>
        <p className="text-sm text-white/55">
          {canvasT(t, 'list.heroDescription')}
        </p>
      </div>
    </div>
  );
}

export function CanvasListPage({
  initialCanvases,
}: {
  initialCanvases: CanvasDocumentSummary[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useCanvasTranslations();
  const [canvases, setCanvases] = useState(initialCanvases);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onboardingState = window.localStorage.getItem(
      ONBOARDING_LOCAL_STORAGE_KEY
    );
    const settings = readProviderSettingsFromLocalStorage();
    const hasKey = Boolean(
      settings.openrouterApiKey.trim() ||
        settings.replicateApiToken.trim() ||
        settings.cyberbaraApiKey.trim()
    );

    if (!onboardingState && !hasKey) {
      setIsOnboardingOpen(true);
    }
  }, []);

  const refreshCanvases = async () => {
    const response = await fetch('/api/canvas');
    const json = await response.json();
    if (!response.ok || json.code !== 0 || !json.data?.items) {
      throw new Error(json.message || canvasT(t, 'toast.reloadCanvasFailed'));
    }

    setCanvases(json.data.items as CanvasDocumentSummary[]);
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const json = await response.json();
      if (!response.ok || json.code !== 0 || !json.data?.canvas) {
        throw new Error(json.message || canvasT(t, 'toast.createCanvasFailed'));
      }

      const nextCanvas = json.data.canvas as CanvasDocumentSummary;
      setCanvases((current) => [nextCanvas, ...current]);
      router.push(`/canvas/${nextCanvas.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : canvasT(t, 'toast.createCanvasFailed')
      );
    } finally {
      setIsCreating(false);
    }
  };

  const beginRename = (canvas: CanvasDocumentSummary) => {
    setEditingId(canvas.id);
    setDraftTitle(canvas.title);
  };

  const cancelRename = () => {
    setEditingId(null);
    setDraftTitle('');
  };

  const handleRename = async (canvas: CanvasDocumentSummary) => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) {
      toast.error(canvasT(t, 'toast.canvasTitleRequired'));
      return;
    }

    if (nextTitle === canvas.title) {
      cancelRename();
      return;
    }

    try {
      setPendingIds((current) => ({ ...current, [canvas.id]: true }));
      const response = await fetch(`/api/canvas/${canvas.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: nextTitle }),
      });

      const json = await response.json();
      if (!response.ok || json.code !== 0 || !json.data?.canvas) {
        throw new Error(json.message || canvasT(t, 'toast.renameCanvasFailed'));
      }

      const updatedCanvas = json.data.canvas as CanvasDocumentSummary;
      setCanvases((current) =>
        current.map((item) => (item.id === updatedCanvas.id ? updatedCanvas : item))
      );
      cancelRename();
      toast.success(canvasT(t, 'toast.renameCanvasSuccess'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : canvasT(t, 'toast.renameCanvasFailed')
      );
    } finally {
      setPendingIds((current) => ({ ...current, [canvas.id]: false }));
    }
  };

  const handleDelete = async (canvas: CanvasDocumentSummary) => {
    if (
      !window.confirm(
        canvasT(t, 'list.deleteConfirm', {
          title: localizeCanvasTitle(t, canvas.title),
        })
      )
    ) {
      return;
    }

    try {
      setPendingIds((current) => ({ ...current, [canvas.id]: true }));
      const response = await fetch(`/api/canvas/${canvas.id}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (!response.ok || json.code !== 0) {
        throw new Error(json.message || canvasT(t, 'toast.deleteCanvasFailed'));
      }

      await refreshCanvases();
      toast.success(canvasT(t, 'toast.deleteCanvasSuccess'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : canvasT(t, 'toast.deleteCanvasFailed')
      );
    } finally {
      setPendingIds((current) => ({ ...current, [canvas.id]: false }));
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
      await refreshCanvases();
      toast.success(`Imported "${result.title}".`);
      router.push(`/canvas/${result.canvasId}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : canvasT(t, 'toast.importFileFailed', { name: file.name })
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportCanvas}
      />
      <ProviderSettingsDialog
        open={isProviderDialogOpen}
        onOpenChange={setIsProviderDialogOpen}
      />
      <OnboardingWizard
        open={isOnboardingOpen}
        onOpenChange={setIsOnboardingOpen}
      />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mt-10 flex flex-col gap-4 rounded-[24px] border border-white/10 bg-black px-6 py-8 shadow-2xl shadow-black/30 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge className="bg-white/10 text-white hover:bg-white/10">
              {canvasT(t, 'common.canvas')}
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold md:text-4xl">{canvasT(t, 'list.title')}</h1>
              <p className="max-w-2xl text-sm text-white/70 md:text-base">
                {canvasT(t, 'list.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/10"
              onClick={() => setIsProviderDialogOpen(true)}
            >
              <Settings className="size-4" />
              {canvasT(t, 'common.settings')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/10"
              onClick={() => setIsOnboardingOpen(true)}
            >
              <WandSparkles className="size-4" />
              {canvasT(t, 'list.setupGuide')}
            </Button>
            {canvases[0] ? (
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-transparent text-white hover:bg-white/10"
                onClick={() =>
                  router.push(`/canvas/${canvases[0].id}`)
                }
              >
                {canvasT(t, 'list.latestCanvas')}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              {canvasT(t, 'list.importJson')}
            </Button>
            <Button
              type="button"
              className="bg-white text-black hover:bg-white/90"
              onClick={handleCreate}
              disabled={isCreating}
            >
              <Plus className="size-4" />
              {isCreating ? canvasT(t, 'list.creating') : canvasT(t, 'list.newCanvas')}
            </Button>
          </div>
        </div>

        {canvases.length === 0 ? (
          <div className="mt-8 rounded-[20px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-16 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/5">
              <Workflow className="size-7 text-white/75" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">{canvasT(t, 'list.emptyTitle')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              {canvasT(t, 'list.emptyDescription')}
            </p>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="mt-6 bg-white text-black hover:bg-white/90"
            >
              <Plus className="size-4" />
              {canvasT(t, 'list.createFirstCanvas')}
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {canvases.map((canvas) => {
              const isPending = Boolean(pendingIds[canvas.id]);
              const isEditing = editingId === canvas.id;

              return (
                <div
                  key={canvas.id}
                  className={`overflow-hidden rounded-[20px] border border-white/10 bg-[#0d0d0d] transition-transform duration-200 ${
                    isPending ? 'pointer-events-none opacity-70' : 'hover:-translate-y-0.5'
                  }`}
                >
                  <Link
                    href={`/canvas/${canvas.id}`}
                    className="block"
                    aria-label={canvasT(t, 'list.openAria', {
                      title: localizeCanvasTitle(t, canvas.title),
                    })}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden border-b border-white/10 bg-black">
                      {renderCanvasHero(
                        {
                          ...canvas,
                          title: localizeCanvasTitle(t, canvas.title),
                        },
                        t
                      )}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/45 to-transparent" />
                    </div>
                  </Link>

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={draftTitle}
                              onChange={(event) => setDraftTitle(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void handleRename(canvas);
                                }
                                if (event.key === 'Escape') {
                                  cancelRename();
                                }
                              }}
                              autoFocus
                              className="border-white/10 bg-black/40 text-white"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleRename(canvas)}
                                disabled={isPending}
                                className="bg-white text-black hover:bg-white/90"
                              >
                                {canvasT(t, 'common.save')}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={cancelRename}
                                disabled={isPending}
                                className="border-white/10 bg-transparent text-white hover:bg-white/10"
                              >
                                {canvasT(t, 'common.cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="truncate text-lg font-semibold">
                              {localizeCanvasTitle(t, canvas.title)}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                              <Clock3 className="size-3.5" />
                              {formatRelativeDate(
                                canvas.updatedAt || canvas.createdAt,
                                t,
                                locale
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {!isEditing ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="size-9 border-white/10 bg-transparent text-white hover:bg-white/10"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="border-white/10 bg-[#121212] text-white"
                          >
                            <DropdownMenuItem onClick={() => beginRename(canvas)}>
                              <FilePenLine className="size-4" />
                              {canvasT(t, 'common.rename')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => void handleDelete(canvas)}
                            >
                              <Trash2 className="size-4" />
                              {canvasT(t, 'common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between text-sm text-white/55">
                      <span>
                        {canvasT(t, 'list.nodeCount', {
                          count: canvas.preview.nodeCount,
                        })}
                        {canvas.preview.imageCount > 0
                          ? `, ${canvasT(t, 'list.imageCount', {
                              count: canvas.preview.imageCount,
                            })}`
                          : ''}
                        {canvas.preview.videoCount > 0
                          ? `, ${canvasT(t, 'list.videoCount', {
                              count: canvas.preview.videoCount,
                            })}`
                          : ''}
                      </span>
                      <Link
                        href={`/canvas/${canvas.id}`}
                        className="inline-flex items-center gap-1 text-white transition hover:text-white/75"
                      >
                        {canvasT(t, 'common.open')}
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
