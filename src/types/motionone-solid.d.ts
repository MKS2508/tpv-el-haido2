declare module '@motionone/solid' {
  import { Component, JSX } from 'solid-js';

  export interface MotionComponentProps {
    initial?: Record<string, unknown>;
    animate?: Record<string, unknown>;
    exit?: Record<string, unknown>;
    hover?: Record<string, unknown>;
    press?: Record<string, unknown>;
    transition?: {
      duration?: number;
      delay?: number;
      easing?: string | number[];
    };
    class?: string;
    style?: JSX.CSSProperties;
    children?: JSX.Element;
    onClick?: (e: MouseEvent) => void;
    onMouseEnter?: (e: MouseEvent) => void;
    onMouseLeave?: (e: MouseEvent) => void;
  }

  type HTMLMotionComponents = {
    [K in keyof JSX.IntrinsicElements]: Component<MotionComponentProps & JSX.IntrinsicElements[K]>;
  };

  export const Motion: HTMLMotionComponents;

  export interface PresenceProps {
    exitBeforeEnter?: boolean;
    initial?: boolean;
    children?: JSX.Element;
  }

  export const Presence: Component<PresenceProps>;
}
