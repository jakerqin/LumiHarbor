'use client';

import { Streamdown, type StreamdownProps } from 'streamdown';

export interface MarkdownRendererProps {
  markdown: string;
  className?: string;
  mode?: StreamdownProps['mode'];
  controls?: StreamdownProps['controls'];
  components?: StreamdownProps['components'];
  remarkPlugins?: StreamdownProps['remarkPlugins'];
}

export function MarkdownRenderer({
  markdown,
  className,
  mode = 'static',
  controls = false,
  components,
  remarkPlugins,
}: MarkdownRendererProps) {
  return (
    <Streamdown
      mode={mode}
      controls={controls}
      className={className}
      cdnUrl={null}
      components={components}
      remarkPlugins={remarkPlugins}
    >
      {markdown}
    </Streamdown>
  );
}
