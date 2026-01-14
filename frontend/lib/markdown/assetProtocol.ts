export const ASSET_PROXY_PATH_PREFIX = '/__asset__/';

const ASSET_PROTOCOL_REGEX = /^asset:\/\/(\d+)\s*$/i;
const ASSET_PROXY_PATH_REGEX = /^\/__asset__\/(\d+)(?:[?#].*)?$/i;

export function toAssetProxyPath(assetId: number | string) {
  return `${ASSET_PROXY_PATH_PREFIX}${assetId}`;
}

export function rewriteAssetProtocolUrl(url: string): string | null {
  const match = ASSET_PROTOCOL_REGEX.exec(url.trim());
  if (!match) return null;
  return toAssetProxyPath(match[1]);
}

export function parseAssetIdFromUri(uri: string): number | null {
  const trimmed = uri.trim();

  const protocolMatch = ASSET_PROTOCOL_REGEX.exec(trimmed);
  if (protocolMatch) {
    const value = Number(protocolMatch[1]);
    return Number.isFinite(value) ? value : null;
  }

  const proxyMatch = ASSET_PROXY_PATH_REGEX.exec(trimmed);
  if (proxyMatch) {
    const value = Number(proxyMatch[1]);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

type MdastNodeLike = {
  url?: unknown;
  children?: unknown;
  [key: string]: unknown;
};

function walkTree(node: unknown) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const child of node) walkTree(child);
    return;
  }

  if (typeof node !== 'object') return;

  const current = node as MdastNodeLike;
  if (typeof current.url === 'string') {
    const rewritten = rewriteAssetProtocolUrl(current.url);
    if (rewritten) current.url = rewritten;
  }

  if (Array.isArray(current.children)) {
    for (const child of current.children) walkTree(child);
  }
}

export function remarkRewriteAssetProtocolUrls() {
  return (tree: unknown) => {
    walkTree(tree);
  };
}

