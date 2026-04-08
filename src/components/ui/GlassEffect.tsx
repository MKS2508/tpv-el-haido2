import { Motion } from '@motionone/solid';
import { createEffect, createSignal, type JSX } from 'solid-js';

interface GlassEffectProps {
  children: JSX.Element;
  width?: number;
  height?: number;
  radius?: number;
  frost?: number;
  blur?: number;
  border?: number;
  alpha?: number;
  lightness?: number;
  scale?: number;
  displace?: number;
  r?: number;
  g?: number;
  b?: number;
  class?: string;
}

const GlassEffect = (props: GlassEffectProps) => {
  const [displacementUri, setDisplacementUri] = createSignal('');
  const filterId = `glass-filter-${Math.random().toString(36).substr(2, 9)}`;

  createEffect(() => {
    const buildDisplacementImage = () => {
      const borderSize =
        Math.min(props.width ?? 400, props.height ?? 300) * ((props.border ?? 0.1) * 0.5);

      const svgContent = `
        <svg viewBox="0 0 ${props.width ?? 400} ${props.height ?? 300}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="red" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#0000"/>
              <stop offset="100%" stop-color="red"/>
            </linearGradient>
            <linearGradient id="blue" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0000"/>
              <stop offset="100%" stop-color="blue"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="${props.width ?? 400}" height="${props.height ?? 300}" fill="black"></rect>
          <rect x="0" y="0" width="${props.width ?? 400}" height="${props.height ?? 300}" rx="${props.radius ?? 20}" fill="url(#red)" />
          <rect x="0" y="0" width="${props.width ?? 400}" height="${props.height ?? 300}" rx="${props.radius ?? 20}" fill="url(#blue)" style="mix-blend-mode: difference" />
          <rect x="${borderSize}" y="${borderSize}" width="${(props.width ?? 400) - borderSize * 2}" height="${(props.height ?? 300) - borderSize * 2}" rx="${props.radius ?? 20}" fill="hsl(0 0% ${props.lightness ?? 50}% / ${props.alpha ?? 0.9})" style="filter:blur(${props.blur ?? 10}px)" />
        </svg>
      `;

      const encoded = encodeURIComponent(svgContent);
      setDisplacementUri(`data:image/svg+xml,${encoded}`);
    };

    buildDisplacementImage();
  });

  return (
    <>
      <svg class="absolute opacity-0 pointer-events-none" width="0" height="0" aria-hidden="true">
        <title>Glass Effect Filter</title>
        <defs>
          <filter id={filterId}>
            <feImage href={displacementUri()} result="map" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              xChannelSelector="R"
              yChannelSelector="B"
              scale={props.scale ?? -180}
              result="dispRed"
            />
            <feColorMatrix
              in="dispRed"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="red"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              xChannelSelector="G"
              yChannelSelector="B"
              scale={(props.scale ?? -180) + (props.g ?? 10)}
              result="dispGreen"
            />
            <feColorMatrix
              in="dispGreen"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="green"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              xChannelSelector="B"
              yChannelSelector="R"
              scale={(props.scale ?? -180) + (props.b ?? 20)}
              result="dispBlue"
            />
            <feColorMatrix
              in="dispBlue"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="blue"
            />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur in="output" stdDeviation={props.displace ?? 0.5} />
          </filter>
        </defs>
      </svg>
      <Motion.div
        class={`relative overflow-hidden ${props.class ?? ''}`}
        style={{
          width: `${props.width ?? 400}px`,
          height: `${props.height ?? 300}px`,
          'border-radius': `${props.radius ?? 20}px`,
          background: `hsl(0 0% 100% / ${props.frost ?? 0.1})`,
          'backdrop-filter': `url(#${filterId})`,
          '-webkit-backdrop-filter': `url(#${filterId})`,
          'will-change': 'backdrop-filter',
          'box-shadow': `
            0 0 2px 1px hsl(0 0% 0% / 0.15) inset,
            0 0 10px 4px hsl(0 0% 0% / 0.1) inset,
            0px 4px 16px rgba(17, 17, 26, 0.05),
            0px 8px 24px rgba(17, 17, 26, 0.05),
            0px 16px 56px rgba(17, 17, 26, 0.05),
            0px 4px 16px rgba(17, 17, 26, 0.05) inset,
            0px 8px 24px rgba(17, 17, 26, 0.05) inset,
            0px 16px 56px rgba(17, 17, 26, 0.05) inset
          `,
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, easing: 'easeOut' }}
      >
        <div class="relative z-10 w-full h-full p-6">{props.children}</div>
      </Motion.div>
    </>
  );
};

export default GlassEffect;
