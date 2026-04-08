import {
  type Accessor,
  type Component,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
} from 'solid-js';
import { cn } from '@/lib/utils';

interface TableScrollProps {
  children: JSX.Element;
  class?: string;
  showFadeIndicator?: Accessor<boolean>;
  fadeThreshold?: number;
}

/**
 * TableScroll - Modern horizontal scroll container with scroll snap
 *
 * Features:
 * - Scroll snap for precise item alignment
 * - Optional fade indicator when scrollable
 * - Touch-optimized behavior
 * - Keyboard navigation support
 * - Performance optimized with passive listeners
 *
 * @example
 * ```tsx
 * <TableScroll showFadeIndicator={() => items.length > 6}>
 *   <For each={items}>{item => (
 *     <div class="neworder-scroll-snap-item">{item}</div>
 *   )}</For>
 * </TableScroll>
 * ```
 */
const TableScroll: Component<TableScrollProps> = (props) => {
  let scrollContainerRef: HTMLDivElement | undefined;
  const [isScrollable, setIsScrollable] = createSignal(false);
  const [isScrolledToEnd, setIsScrolledToEnd] = createSignal(false);
  const [_isScrolledToStart, setIsScrolledToStart] = createSignal(true);

  const checkScrollability = () => {
    if (!scrollContainerRef) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef;

    setIsScrollable(scrollWidth > clientWidth);
    setIsScrolledToEnd(scrollLeft + clientWidth >= scrollWidth - 1);
    setIsScrolledToStart(scrollLeft <= 1);
  };

  const handleScroll = () => {
    if ('requestAnimationFrame' in window) {
      requestAnimationFrame(checkScrollability);
    } else {
      checkScrollability();
    }
  };

  onMount(() => {
    if (!scrollContainerRef) return;

    // Initial check
    checkScrollability();

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });

    resizeObserver.observe(scrollContainerRef);

    // Passive scroll listener for better performance
    scrollContainerRef.addEventListener('scroll', handleScroll, { passive: true });

    onCleanup(() => {
      resizeObserver.disconnect();
      if (scrollContainerRef) {
        scrollContainerRef.removeEventListener('scroll', handleScroll);
      }
    });
  });

  const showFade = () => {
    if (props.showFadeIndicator?.()) {
      return isScrollable() && !isScrolledToEnd();
    }
    return false;
  };

  return (
    <div class="relative min-h-[2.25rem] flex items-center overflow-hidden">
      <div
        ref={scrollContainerRef}
        class={cn('neworder-scroll-container flex gap-1 pb-1 -mb-1 flex-nowrap', props.class)}
      >
        {props.children}
      </div>

      {/* Fade indicator */}
      {showFade() && <div class="neworder-scroll-fade" aria-hidden="true" />}
    </div>
  );
};

export default TableScroll;
