import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const BOXES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M11.5 1.5a1.5 1.5 0 0 1 1.5 0l3 1.7-4.5 2.6L7 3.2l4.5-1.7ZM6.5 4L2 6.6v3.4l4.5 2.6L11 10V6.6L6.5 4ZM13 6.6V10l4.5 2.6L22 10V6.6L17.5 4 13 6.6ZM2 12v3.4l4.5 2.6L11 15.4V12L6.5 9.4 2 12ZM13 12v3.4l4.5 2.6L22 15.4V12l-4.5-2.6L13 12Z"/></svg>`;

const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(BOXES_SVG)}`;

export default function AppleIcon() {
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
        }}
      >
        <img src={dataUri} width={130} height={130} />
      </div>
    ),
    { ...size }
  );
}
