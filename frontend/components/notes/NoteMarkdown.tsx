'use client';

import { useMemo } from 'react';
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from 'react';
import { defaultRemarkPlugins } from 'streamdown';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import type { Asset } from '@/lib/api/types';
import { AssetEmbed } from '@/components/notes/AssetEmbed';
import { parseAssetIdFromUri, remarkRewriteAssetProtocolUrls } from '@/lib/markdown/assetProtocol';

type ImgProps = ImgHTMLAttributes<HTMLImageElement> & { node?: unknown };
type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown };

const noteRemarkPlugins = [...Object.values(defaultRemarkPlugins), remarkRewriteAssetProtocolUrls];

export interface NoteMarkdownProps {
  markdown: string;
  className?: string;
  assets?: Asset[] | null;
}

export function NoteMarkdown({ markdown, className, assets }: NoteMarkdownProps) {
  const assetById = useMemo(() => {
    return new Map((assets ?? []).map((asset) => [asset.id, asset]));
  }, [assets]);

  const components = useMemo(() => {
    return {
      img: (props: ImgProps) => {
        const { node, src, alt, ...rest } = props;
        void node;
        const srcValue = typeof src === 'string' ? src : '';
        const assetId = parseAssetIdFromUri(srcValue);
        if (assetId !== null) {
          return (
            <AssetEmbed
              assetId={assetId}
              caption={typeof alt === 'string' ? alt : undefined}
              asset={assetById.get(assetId) ?? null}
            />
          );
        }
        return <img src={srcValue} alt={typeof alt === 'string' ? alt : ''} {...rest} />;
      },
      a: (props: AnchorProps) => {
        const { node, href, children, ...rest } = props;
        void node;
        const hrefValue = typeof href === 'string' ? href : '';
        const assetId = parseAssetIdFromUri(hrefValue);
        if (assetId !== null) {
          return (
            <a href={`/assets/${assetId}`} {...rest}>
              {children}
            </a>
          );
        }
        return (
          <a href={hrefValue} {...rest}>
            {children}
          </a>
        );
      },
    };
  }, [assetById]);

  return (
    <MarkdownRenderer
      markdown={markdown}
      className={className}
      components={components}
      remarkPlugins={noteRemarkPlugins}
    />
  );
}
