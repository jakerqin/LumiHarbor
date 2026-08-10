'use client';

import { NoteBackButton } from './NoteBackButton';

interface NoteEditorNavbarProps {
  onBack?: () => void;
}

export function NoteEditorNavbar({ onBack }: NoteEditorNavbarProps) {
  return <NoteBackButton onBack={onBack} />;
}
