import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

const BOXES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-4.5-2.7a2 2 0 0 0-2.06 0L2.97 12.92Z"/><path d="M11 16.5v5.5l4.5-2.7a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L11 10.5v6Z"/><path d="M14.5 3.5 19 6l-4.5 2.5L10 6l4.5-2.5Z"/></svg>`;

const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(BOXES_SVG)}`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          borderRadius: '7px',
        }}
      >
        <img src={dataUri} width={22} height={22} />
      </div>
    ),
    { ...size }
  );
}
