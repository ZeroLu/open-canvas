'use client';

import { useMemo, useState } from 'react';
import { KeyRound, Server, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  DEFAULT_PROVIDER_SETTINGS,
  normalizeProviderSettings,
  providerSettingsToErrorMap,
} from '@/lib/provider-settings';
import type { ProviderSettings } from '@/lib/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

export const PROVIDER_SETTINGS_LOCAL_STORAGE_KEY =
  'open-canvas/provider-settings/v1';
export const ONBOARDING_LOCAL_STORAGE_KEY = 'open-canvas/onboarding/v1';

export function readProviderSettingsFromLocalStorage() {
  if (typeof window === 'undefined') {
    return DEFAULT_PROVIDER_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(PROVIDER_SETTINGS_LOCAL_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROVIDER_SETTINGS;
    }

    return normalizeProviderSettings(
      JSON.parse(raw) as Partial<ProviderSettings>
    );
  } catch {
    return DEFAULT_PROVIDER_SETTINGS;
  }
}

function hasAnyApiKey(settings: ProviderSettings) {
  return Boolean(
    settings.cyberbaraApiKey.trim() ||
      settings.openrouterApiKey.trim() ||
      settings.replicateApiToken.trim()
  );
}

async function saveProviderSettings(settings: ProviderSettings) {
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

  window.localStorage.setItem(
    PROVIDER_SETTINGS_LOCAL_STORAGE_KEY,
    JSON.stringify(settings)
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-red-400">{message}</p>;
}

function ProviderSettingsFields({
  settings,
  fieldErrors,
  onChange,
  showProviderKeys = true,
  showStorage = true,
}: {
  settings: ProviderSettings;
  fieldErrors: Partial<Record<keyof ProviderSettings, string>>;
  onChange: <K extends keyof ProviderSettings>(
    key: K,
    value: ProviderSettings[K]
  ) => void;
  showProviderKeys?: boolean;
  showStorage?: boolean;
}) {
  const t = useTranslations('providerSettings');

  return (
    <div className="space-y-5">
      {showProviderKeys ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="openrouterApiKey">{t('fields.openrouterApiKey')}</Label>
              <Input
                id="openrouterApiKey"
                type="password"
                value={settings.openrouterApiKey}
                onChange={(event) =>
                  onChange('openrouterApiKey', event.target.value)
                }
                placeholder="sk-or-..."
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.openrouterApiKey} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="openrouterBaseUrl">{t('fields.openrouterBaseUrl')}</Label>
              <Input
                id="openrouterBaseUrl"
                value={settings.openrouterBaseUrl}
                onChange={(event) =>
                  onChange('openrouterBaseUrl', event.target.value)
                }
                placeholder="https://openrouter.ai/api/v1"
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.openrouterBaseUrl} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="replicateApiToken">{t('fields.replicateApiToken')}</Label>
              <Input
                id="replicateApiToken"
                type="password"
                value={settings.replicateApiToken}
                onChange={(event) =>
                  onChange('replicateApiToken', event.target.value)
                }
                placeholder="r8_..."
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.replicateApiToken} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="cyberbaraApiKey">{t('fields.cyberbaraApiKey')}</Label>
              <Input
                id="cyberbaraApiKey"
                type="password"
                value={settings.cyberbaraApiKey}
                onChange={(event) =>
                  onChange('cyberbaraApiKey', event.target.value)
                }
                placeholder="sk-..."
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.cyberbaraApiKey} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="cyberbaraBaseUrl">{t('fields.cyberbaraBaseUrl')}</Label>
              <Input
                id="cyberbaraBaseUrl"
                value={settings.cyberbaraBaseUrl}
                onChange={(event) =>
                  onChange('cyberbaraBaseUrl', event.target.value)
                }
                placeholder="https://cyberbara.com"
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.cyberbaraBaseUrl} />
            </div>
          </div>
        </>
      ) : null}

      {showStorage ? (
        <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>{t('fields.uploadStorage')}</Label>
          <Select
            value={settings.storageProvider}
            onValueChange={(value) =>
              onChange(
                'storageProvider',
                value as ProviderSettings['storageProvider']
              )
            }
          >
            <SelectTrigger className="border-white/10 bg-black/40 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0f1115] text-white">
              <SelectItem value="disabled">{t('storage.disabled')}</SelectItem>
              <SelectItem value="cyberbara">{t('storage.cyberbara')}</SelectItem>
              <SelectItem value="s3-compatible">{t('storage.s3')}</SelectItem>
            </SelectContent>
          </Select>
          <FieldError message={fieldErrors.storageProvider} />
        </div>

        {settings.storageProvider === 's3-compatible' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="storageS3Endpoint">{t('fields.s3Endpoint')}</Label>
              <Input
                id="storageS3Endpoint"
                value={settings.storageS3Endpoint}
                onChange={(event) =>
                  onChange('storageS3Endpoint', event.target.value)
                }
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.storageS3Endpoint} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storageS3Region">{t('fields.s3Region')}</Label>
              <Input
                id="storageS3Region"
                value={settings.storageS3Region}
                onChange={(event) =>
                  onChange('storageS3Region', event.target.value)
                }
                className="border-white/10 bg-black/40 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storageS3Bucket">{t('fields.s3Bucket')}</Label>
              <Input
                id="storageS3Bucket"
                value={settings.storageS3Bucket}
                onChange={(event) =>
                  onChange('storageS3Bucket', event.target.value)
                }
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.storageS3Bucket} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storageS3AccessKeyId">{t('fields.s3AccessKey')}</Label>
              <Input
                id="storageS3AccessKeyId"
                value={settings.storageS3AccessKeyId}
                onChange={(event) =>
                  onChange('storageS3AccessKeyId', event.target.value)
                }
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.storageS3AccessKeyId} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storageS3SecretAccessKey">{t('fields.s3SecretKey')}</Label>
              <Input
                id="storageS3SecretAccessKey"
                type="password"
                value={settings.storageS3SecretAccessKey}
                onChange={(event) =>
                  onChange('storageS3SecretAccessKey', event.target.value)
                }
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.storageS3SecretAccessKey} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="storageS3PublicDomain">{t('fields.s3PublicDomain')}</Label>
              <Input
                id="storageS3PublicDomain"
                value={settings.storageS3PublicDomain}
                onChange={(event) =>
                  onChange('storageS3PublicDomain', event.target.value)
                }
                placeholder="Optional"
                className="border-white/10 bg-black/40 text-white"
              />
              <FieldError message={fieldErrors.storageS3PublicDomain} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="storageS3PathPrefix">{t('fields.s3PathPrefix')}</Label>
              <Input
                id="storageS3PathPrefix"
                value={settings.storageS3PathPrefix}
                onChange={(event) =>
                  onChange('storageS3PathPrefix', event.target.value)
                }
                className="border-white/10 bg-black/40 text-white"
              />
            </div>
          </div>
        ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProviderSettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (settings: ProviderSettings) => void;
}) {
  const t = useTranslations('providerSettings');
  const [settings, setSettings] = useState<ProviderSettings>(() =>
    readProviderSettingsFromLocalStorage()
  );
  const [isSaving, setIsSaving] = useState(false);
  const fieldErrors = useMemo(
    () => providerSettingsToErrorMap(settings),
    [settings]
  );

  const handleChange = <K extends keyof ProviderSettings>(
    key: K,
    value: ProviderSettings[K]
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    const nextErrors = providerSettingsToErrorMap(settings);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fix the provider settings first.');
      return;
    }

    try {
      setIsSaving(true);
      await saveProviderSettings(settings);
      toast.success(t('toast.saved'));
      onSaved?.(settings);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('toast.failed')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-2xl overflow-y-auto border-white/10 bg-[#0f1115] text-white">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
          {t('dialogDescription')}
        </div>

        <ProviderSettingsFields
          settings={settings}
          fieldErrors={fieldErrors}
          onChange={handleChange}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-transparent text-white hover:bg-white/10"
            onClick={() => onOpenChange(false)}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-white text-black hover:bg-zinc-200"
          >
            {isSaving ? t('actions.saving') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OnboardingWizard({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (settings: ProviderSettings) => void;
}) {
  const t = useTranslations('providerSettings');
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<ProviderSettings>(() =>
    readProviderSettingsFromLocalStorage()
  );
  const [isSaving, setIsSaving] = useState(false);
  const fieldErrors = useMemo(
    () => providerSettingsToErrorMap(settings),
    [settings]
  );

  const handleChange = <K extends keyof ProviderSettings>(
    key: K,
    value: ProviderSettings[K]
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const closeWizard = () => {
    window.localStorage.setItem(ONBOARDING_LOCAL_STORAGE_KEY, 'done');
    onOpenChange(false);
  };

  const completeWizard = async () => {
    const nextErrors = providerSettingsToErrorMap(settings);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fix the highlighted settings.');
      return;
    }

    try {
      setIsSaving(true);
      await saveProviderSettings(settings);
      window.localStorage.setItem(ONBOARDING_LOCAL_STORAGE_KEY, 'done');
      toast.success(t('toast.ready'));
      onComplete?.(settings);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('toast.failed')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-2xl overflow-y-auto border-white/10 bg-[#0f1115] text-white">
        <DialogHeader>
          <DialogTitle>{t('setupTitle')}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['1', t('steps.chooseKeys')],
            ['2', t('steps.addStorage')],
            ['3', t('steps.startCreating')],
          ].map(([number, label], index) => (
            <div
              key={number}
              className={`rounded-lg border p-3 text-sm ${
                step === index
                  ? 'border-white/30 bg-white/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/55'
              }`}
            >
              <div className="text-xs text-white/45">{t('steps.stepLabel', { number })}</div>
              <div className="mt-1 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-5">
            <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-white/70" />
              <p>
                {t('intro')}
              </p>
            </div>
            <ProviderSettingsFields
              settings={settings}
              fieldErrors={fieldErrors}
              onChange={handleChange}
              showStorage={false}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
              <Server className="mt-0.5 size-4 shrink-0 text-white/70" />
              <p>
                {t('storageIntro')}
              </p>
            </div>
            <ProviderSettingsFields
              settings={settings}
              fieldErrors={fieldErrors}
              onChange={handleChange}
              showProviderKeys={false}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-white/70" />
              <p>
                {t('readyIntro')}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-medium">OpenRouter</div>
                <div className="mt-1 text-xs text-white/55">
                  {settings.openrouterApiKey ? t('status.configured') : t('status.notSet')}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-medium">Replicate</div>
                <div className="mt-1 text-xs text-white/55">
                  {settings.replicateApiToken ? t('status.configured') : t('status.notSet')}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-medium">Cyberbara</div>
                <div className="mt-1 text-xs text-white/55">
                  {settings.cyberbaraApiKey ? t('status.configured') : t('status.notSet')}
                </div>
              </div>
            </div>
            {!hasAnyApiKey(settings) ? (
              <div className="rounded-lg border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm text-yellow-100">
                {t('skipWarning')}
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-white/10 bg-transparent text-white hover:bg-white/10"
            onClick={closeWizard}
          >
            {t('actions.skip')}
          </Button>
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/10"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              {t('actions.back')}
            </Button>
          ) : null}
          {step < 2 ? (
            <Button
              type="button"
              className="bg-white text-black hover:bg-zinc-200"
              onClick={() => setStep((current) => Math.min(2, current + 1))}
            >
              {t('actions.continue')}
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-white text-black hover:bg-zinc-200"
              onClick={completeWizard}
              disabled={isSaving}
            >
              {isSaving ? t('actions.saving') : t('actions.finish')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
