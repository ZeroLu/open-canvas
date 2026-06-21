import { cn } from '@/shared/lib/utils';

export function ModelSelectOption({
  model: _model,
  label,
  description,
  className,
}: {
  model?: string;
  label: string;
  description?: string | null;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="truncate">{label}</span>
      {description ? (
        <span className="text-xs text-zinc-500">{description}</span>
      ) : null}
    </div>
  );
}
