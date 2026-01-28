import { Tabs as KobalteTabs } from '@kobalte/core/tabs';
import type { JSX } from 'solid-js';
import { splitProps } from 'solid-js';

import { cn } from '@/lib/utils';

const Tabs = KobalteTabs;

interface TabsListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
}

function TabsList(props: TabsListProps) {
  const [local, others] = splitProps(props, ['class', 'ref']);
  return (
    <KobalteTabs.List
      ref={local.ref}
      class={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        local.class
      )}
      {...others}
    />
  );
}

interface TabsTriggerProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  ref?: HTMLButtonElement | ((el: HTMLButtonElement) => void);
  value: string;
}

function TabsTrigger(props: TabsTriggerProps) {
  const [local, others] = splitProps(props, ['class', 'ref', 'value']);
  return (
    <KobalteTabs.Trigger
      ref={local.ref}
      value={local.value}
      class={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm',
        local.class
      )}
      {...others}
    />
  );
}

interface TabsContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  ref?: HTMLDivElement | ((el: HTMLDivElement) => void);
  value: string;
}

function TabsContent(props: TabsContentProps) {
  const [local, others] = splitProps(props, ['class', 'ref', 'value']);
  return (
    <KobalteTabs.Content
      ref={local.ref}
      value={local.value}
      class={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        local.class
      )}
      {...others}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
