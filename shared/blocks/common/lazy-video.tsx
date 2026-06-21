'use client';

export function LazyVideo(
  props: React.VideoHTMLAttributes<HTMLVideoElement> & {
    loadStrategy?: string;
  }
) {
  const { loadStrategy: _loadStrategy, ...rest } = props;
  return <video {...rest} />;
}
