'use client';

import { useRef, useState } from 'react';
import { FolderOpen, LoaderCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { AssetPickerDialog } from '@/shared/blocks/common/asset-picker-dialog';
import { Button } from '@/shared/components/ui/button';
import {
  canvasT,
  localizeCanvasNodeTitle,
  translateCanvasRuntimeMessage,
} from '@/shared/lib/canvas/i18n';
import {
  getCanvasImageAspectRatioOptions,
  normalizeCanvasImageSettingsForModel,
} from '@/shared/lib/canvas/model-options';
import {
  type CanvasImageNodeData,
  type CanvasNodeMedia,
  type CanvasVideoNodeData,
} from '@/shared/lib/canvas/types';
import { useCanvasTranslations } from '@/shared/lib/canvas/use-canvas-translations';
import { cn } from '@/shared/lib/utils';
import type { AssetItem } from '@/shared/blocks/common/asset-picker-dialog';

type CanvasMediaNodeData = CanvasImageNodeData | CanvasVideoNodeData;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
export const IMAGE_ACCEPT = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/heif',
].join(',');
export const VIDEO_ACCEPT = ['video/mp4', 'video/quicktime'].join(',');

function getNodeMedia(data: CanvasMediaNodeData): CanvasNodeMedia | null {
  return data.nodeType === 'image' ? data.image : data.video;
}

function buildNodePatch(
  data: CanvasMediaNodeData,
  media: CanvasNodeMedia
): Partial<CanvasMediaNodeData> {
  if (data.nodeType === 'image') {
    return {
      image: media,
      imageOutputs: [media],
      selectedImageIndex: 0,
      inputMode: 'upload',
      status: 'success',
      errorMessage: null,
    };
  }

  return {
    video: media,
    videoHistory: [media],
    selectedVideoIndex: 0,
    inputMode: 'upload',
    status: 'success',
    errorMessage: null,
  };
}

function parseAspectRatioValue(value: string) {
  const [width, height] = value.split(':').map((item) => Number(item));
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return null;
  }

  return width / height;
}

function pickClosestAspectRatio({
  width,
  height,
  options,
}: {
  width: number;
  height: number;
  options: string[];
}) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const targetRatio = width / height;
  let bestOption: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const option of options) {
    if (option.toLowerCase() === 'auto') {
      continue;
    }

    const optionRatio = parseAspectRatioValue(option);
    if (!optionRatio) {
      continue;
    }

    const distance = Math.abs(Math.log(targetRatio / optionRatio));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOption = option;
    }
  }

  return bestOption;
}

async function getImageFileDimensions(file: File) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const dimensions = {
      width: bitmap.width,
      height: bitmap.height,
    };
    bitmap.close();
    return dimensions;
  }

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_dimension_read_failed'));
    };
    image.src = url;
  });
}

function mapAssetToCanvasMedia(item: AssetItem): CanvasNodeMedia {
  return {
    url: item.url,
    source: item.source === 'upload' ? 'uploaded' : 'generated',
    assetId: item.id,
    thumbnailUrl: item.thumbnailUrl || null,
    durationSec: item.durationSec ?? null,
    size: item.size ?? null,
  };
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        reject(new Error('读取视频时长失败。'));
        return;
      }
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('加载视频元数据失败。'));
    };
  });
}

export async function uploadCanvasImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/canvas/uploads/images', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`request failed with status ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 0 || !json.data?.media?.url) {
    throw new Error(json.message || '图片上传失败。');
  }

  return json.data.media as CanvasNodeMedia;
}

export async function uploadCanvasVideo(
  file: File,
  durationSec: number | null
) {
  const formData = new FormData();
  formData.append('file', file);
  if (durationSec && Number.isFinite(durationSec)) {
    formData.append('durationSec', String(durationSec));
  }

  const response = await fetch('/api/canvas/uploads/videos', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`request failed with status ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 0 || !json.data?.media?.url) {
    throw new Error(json.message || '视频上传失败。');
  }

  return json.data.media as CanvasNodeMedia;
}

export function CanvasMediaControl({
  nodeData,
  disabled = false,
  onPreviewImage,
  onChange,
}: {
  nodeData: CanvasMediaNodeData;
  disabled?: boolean;
  onPreviewImage?: (image: {
    images: CanvasNodeMedia[];
    activeIndex: number;
    title: string;
  }) => void;
  onChange: (patch: Partial<CanvasMediaNodeData>) => void;
}) {
  const t = useCanvasTranslations();
  const currentMedia = getNodeMedia(nodeData);
  const displayTitle = localizeCanvasNodeTitle(
    t,
    nodeData.nodeType,
    nodeData.title
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);

  const triggerUpload = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      onChange({
        status: 'running',
        errorMessage: null,
      });

      if (nodeData.nodeType === 'image') {
        if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
          throw new Error('不支持的图片格式。');
        }

        if (file.size <= 0) {
          throw new Error('所选图片为空。');
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          throw new Error('图片大小超过 10MB 限制。');
        }

        const dimensions = await getImageFileDimensions(file);
        const inferredAspectRatio = pickClosestAspectRatio({
          ...dimensions,
          options: getCanvasImageAspectRatioOptions(nodeData.model),
        });
        const uploadedMedia = await uploadCanvasImage(file);
        const nextImageSettings = inferredAspectRatio
          ? normalizeCanvasImageSettingsForModel({
              model: nodeData.model,
              aspectRatio: inferredAspectRatio,
              resolution: nodeData.resolution,
            })
          : null;
        onChange({
          ...buildNodePatch(nodeData, {
            ...uploadedMedia,
            thumbnailUrl: uploadedMedia.thumbnailUrl || uploadedMedia.url,
            size: file.size,
          }),
          ...(nextImageSettings ? { ...nextImageSettings } : {}),
        });
      } else {
        if (!VIDEO_ACCEPT.split(',').includes(file.type)) {
          throw new Error('不支持的视频格式，请上传 MP4 或 MOV。');
        }

        if (file.size <= 0) {
          throw new Error('所选视频为空。');
        }

        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          throw new Error('视频大小超过 50MB 限制。');
        }

        const durationSec = await getVideoDuration(file);
        const uploadedMedia = await uploadCanvasVideo(file, durationSec);
        onChange(
          buildNodePatch(nodeData, {
            ...uploadedMedia,
            durationSec: uploadedMedia.durationSec ?? durationSec,
            size: file.size,
          })
        );
      }

      toast.success(
        nodeData.nodeType === 'image'
          ? canvasT(t, 'toast.imageUploadedToCanvas')
          : canvasT(t, 'toast.videoUploadedToCanvas')
      );
    } catch (error) {
      console.error('canvas media upload failed', error);
      const message =
        error instanceof Error
          ? translateCanvasRuntimeMessage(
              t,
              error.message,
              'runtime.canvasMediaUploadFailed'
            )
          : canvasT(t, 'runtime.canvasMediaUploadFailed');
      onChange({
        status: 'error',
        errorMessage: message,
      });
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssetSelect = (items: AssetItem[]) => {
    const item = items[0];
    if (!item) {
      return;
    }

    onChange({
      ...buildNodePatch(nodeData, mapAssetToCanvasMedia(item)),
      status: 'success',
      errorMessage: null,
    });
    toast.success(
      nodeData.nodeType === 'image'
        ? canvasT(t, 'toast.imageAssetAttached')
        : canvasT(t, 'toast.videoAssetAttached')
    );
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
        <div
          className={cn(
            'mx-auto w-full max-w-[160px] overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03]',
            nodeData.nodeType === 'image' ? 'aspect-[4/3]' : 'aspect-video'
          )}
        >
          {nodeData.nodeType === 'image' ? (
            currentMedia?.url ? (
              <button
                type="button"
                onClick={() =>
                  onPreviewImage?.({
                    images: [currentMedia],
                    activeIndex: 0,
                    title: displayTitle,
                  })
                }
                className="block h-full w-full cursor-zoom-in"
              >
                <img
                  src={currentMedia.thumbnailUrl || currentMedia.url}
                  alt={displayTitle}
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <div className="h-full bg-white/[0.02]" />
            )
          ) : currentMedia?.url ? (
            <video
              src={currentMedia.url}
              controls
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full bg-white/[0.02]" />
          )}
        </div>

        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={triggerUpload}
            disabled={disabled || isUploading}
            className="h-9 border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
          >
            {isUploading ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Upload />
            )}
            {currentMedia?.url
              ? canvasT(t, 'media.replaceUpload')
              : canvasT(t, 'media.uploadLocalFile')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAssetDialogOpen(true)}
            disabled={disabled || isUploading}
            className="h-9 border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
          >
            <FolderOpen />
            {canvasT(t, 'media.chooseFromLibrary')}
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={nodeData.nodeType === 'image' ? IMAGE_ACCEPT : VIDEO_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <AssetPickerDialog
        open={isAssetDialogOpen}
        onOpenChange={setIsAssetDialogOpen}
        mediaType={nodeData.nodeType}
        selectedUrls={currentMedia?.url ? [currentMedia.url] : []}
        labels={{
          title:
            nodeData.nodeType === 'image'
              ? canvasT(t, 'media.pickImage')
              : canvasT(t, 'media.pickVideo'),
          description:
            nodeData.nodeType === 'image'
              ? canvasT(t, 'media.attachImageDescription')
              : canvasT(t, 'media.attachVideoDescription'),
          empty:
            nodeData.nodeType === 'image'
              ? canvasT(t, 'media.noImageAssets')
              : canvasT(t, 'media.noVideoAssets'),
          useSelected: canvasT(t, 'media.useSelected'),
          cancel: canvasT(t, 'common.cancel'),
          signInRequired: canvasT(t, 'media.signInRequired'),
          selectedCount: canvasT(t, 'media.selectedCount', {
            count: '{count}',
          }),
        }}
        onSelect={handleAssetSelect}
      />
    </>
  );
}
