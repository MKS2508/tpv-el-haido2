'use client';

import { ReactNode, useState } from 'react';
import { ChevronRight, File as FileIcon, Folder as FolderIcon } from 'lucide-react';

interface FileProps {
  name: string;
  icon?: ReactNode;
}

export function File({ name, icon }: FileProps) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)]">
      {icon || <FileIcon className="w-4 h-4 text-[var(--text-muted)]" />}
      <span className="text-sm font-mono">{name}</span>
    </div>
  );
}

interface FolderProps {
  name: string;
  defaultOpen?: boolean;
  children?: ReactNode;
}

export function Folder({ name, defaultOpen = false, children }: FolderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 py-1 px-2 rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)] w-full text-left"
      >
        <ChevronRight
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
        <FolderIcon
          className={`w-4 h-4 ${isOpen ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)]'}`}
        />
        <span className="text-sm font-mono ml-1">{name}</span>
      </button>
      {isOpen && children && <div className="ml-4 border-l border-[var(--border-subtle)] pl-2">{children}</div>}
    </div>
  );
}

interface FileTreeProps {
  children: ReactNode;
}

export function FileTree({ children }: FileTreeProps) {
  return (
    <div className="my-4 p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)]">
      {children}
    </div>
  );
}
