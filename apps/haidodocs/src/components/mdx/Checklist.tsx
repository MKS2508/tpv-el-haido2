'use client';

import { ReactNode, useState } from 'react';
import { Check, Circle } from 'lucide-react';

interface CheckProps {
  done?: boolean;
  children: ReactNode;
}

export function CheckItem({ done: initialDone = false, children }: CheckProps) {
  const [isDone, setIsDone] = useState(initialDone);

  return (
    <li
      className="flex items-start gap-3 py-2 cursor-pointer group"
      onClick={() => setIsDone(!isDone)}
    >
      <span
        className={`flex-shrink-0 mt-0.5 p-0.5 rounded-full border transition-all ${
          isDone
            ? 'bg-[var(--accent-cyan)] border-[var(--accent-cyan)] text-[var(--bg-primary)]'
            : 'border-[var(--border-subtle)] text-[var(--text-subtle)] group-hover:border-[var(--accent-cyan-dim)]'
        }`}
      >
        {isDone ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
      </span>
      <span
        className={`transition-colors ${
          isDone ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'
        }`}
      >
        {children}
      </span>
    </li>
  );
}

interface ChecklistProps {
  children: ReactNode;
}

export function Checklist({ children }: ChecklistProps) {
  return (
    <ul className="list-none p-0 my-4 space-y-1 bg-[var(--bg-elevated)] rounded-lg p-4 border border-[var(--border-subtle)]">
      {children}
    </ul>
  );
}

export { CheckItem as Check };
