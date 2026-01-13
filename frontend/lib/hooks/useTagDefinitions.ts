'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tagsApi, type TagDefinition } from '@/lib/api/tags';

const TAG_DEFINITIONS_STORAGE_KEY = 'tag-definitions:v1';
const TAG_DEFINITIONS_TTL_MS = 24 * 60 * 60 * 1000;

type TagDefinitionsCache = {
  fetchedAt: number;
  definitions: TagDefinition[];
};

function readCachedTagDefinitions(): TagDefinition[] | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = localStorage.getItem(TAG_DEFINITIONS_STORAGE_KEY);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as Partial<TagDefinitionsCache>;
    if (!parsed || typeof parsed.fetchedAt !== 'number' || !Array.isArray(parsed.definitions)) {
      return undefined;
    }

    if (Date.now() - parsed.fetchedAt > TAG_DEFINITIONS_TTL_MS) return undefined;
    return parsed.definitions;
  } catch {
    return undefined;
  }
}

function writeCachedTagDefinitions(definitions: TagDefinition[]) {
  if (typeof window === 'undefined') return;

  try {
    const payload: TagDefinitionsCache = {
      fetchedAt: Date.now(),
      definitions,
    };
    localStorage.setItem(TAG_DEFINITIONS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage 不可用/空间不足时，忽略缓存
  }
}

export function useTagDefinitions() {
  const query = useQuery({
    queryKey: ['tag-definitions'],
    queryFn: () => tagsApi.getTagDefinitions(),
    staleTime: TAG_DEFINITIONS_TTL_MS,
    gcTime: TAG_DEFINITIONS_TTL_MS,
    refetchOnWindowFocus: false,
    initialData: () => readCachedTagDefinitions(),
  });

  useEffect(() => {
    if (!query.data || query.data.length === 0) return;
    writeCachedTagDefinitions(query.data);
  }, [query.data]);

  const tagNameByKey = useMemo(() => {
    return new Map((query.data ?? []).map((item) => [item.tag_key, item.tag_name]));
  }, [query.data]);

  return {
    ...query,
    tagNameByKey,
  };
}

