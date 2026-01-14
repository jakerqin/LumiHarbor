'use client';

import { Streamdown, type StreamdownProps } from 'streamdown';

export interface MarkdownRendererProps {
  markdown: string;
  className?: string;
  mode?: StreamdownProps['mode'];
  controls?: StreamdownProps['controls'];
}

export function MarkdownRenderer({
  markdown,
  className,
  mode = 'static',
  controls = false,
}: MarkdownRendererProps) {
  return (
    <Streamdown mode={mode} controls={controls} className={className} cdnUrl={null}>
      {markdown}
    </Streamdown>
  );
}
