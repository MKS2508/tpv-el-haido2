import { createEffect, createSignal } from 'solid-js';
import { Motion } from '@motionone/solid';

interface GlassEffectProps {
  children: React.ReactNode;
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
  className?: string;
}

const GlassEffect: React.FC<GlassEffectProps> = ({
  children,
  width = 400,
  height = 300,
  radius = 20,
  frost = 0.1,
  blur = 10,
  border = 0.1,
  alpha = 0.9,
  lightness = 50,
  scale = -180,
  displace = 0.5,

  g = 10,
  b = 20,
  className = '',
}) => {
  const [displacementUri, setDisplacementUri] = createSignal('');
  const filterId = `glass-filter-${Math.random().toString(36).substr(2, 9)}`;

  createEffect(() => {
    const buildDisplacementImage = () => {
      const borderSize = Math.min(width, height) * (border * 0.5);

      const svgContent = `
        <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
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
          <rect x="0" y="0" width="${width}" height="${height}" fill="black"></rect>
          <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" fill="url(#red)" />
          <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" fill="url(#blue)" style="mix-blend-mode: difference" />
          <rect x="${borderSize}" y="${borderSize}" width="${width - borderSize * 2}" height="${height - borderSize * 2}" rx="${radius}" fill="hsl(0 0% ${lightness}% / ${alpha})" style="filter:blur(${blur}px)" />
        </svg>
      `;

      const encoded = encodeURIComponent(svgContent);
      setDisplacementUri(`data:image/svg+xml,${encoded}`);
    };

    buildDisplacementImage();
  });

  return (
    <>
      {/* SVG Filter Definition */}
      <svg
        class="absolute opacity-0 pointer-events-none"
        width="0"
        height="0"
        aria-hidden="true"
      >
        <title>Glass Effect Filter</title>
        <defs>
          <filter id={filterId}>
            <feImage href={displacementUri()} result="map" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              xChannelSelector="R"
              yChannelSelector="B"
              scale={scale}
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
              scale={scale + g}
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
              scale={scale + b}
              result="dispBlue"
            />
            <feColorMatrix
              in="dispBlue"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="blue"
            />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur in="output" stdDeviation={displace} />
          </filter>
        </defs>
      </svg>
      {/* Glass Effect Container */}
      <motion.div
        class={`relative overflow-hidden ${className}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: `${radius}px`,
          background: `hsl(0 0% 100% / ${frost})`,
          backdropFilter: `url(#${filterId})`,
          WebkitBackdropFilter: `url(#${filterId})`,
          willChange: 'backdrop-filter', // Added willChange
          boxShadow: `
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
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div class="relative z-10 w-full h-full p-6">{children}</div>
      </motion.div>
    </>
  );
};

export default GlassEffect;
