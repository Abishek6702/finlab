import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #1D4ED8 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: '48px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
            }}
          >
            FL
          </div>
          <div style={{ fontSize: '48px', fontWeight: '800', letterSpacing: '-1px' }}>
            finLab
          </div>
        </div>

        <div
          style={{
            fontSize: '52px',
            fontWeight: '800',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.15,
            marginBottom: '20px',
          }}
        >
          Your money. Your clarity. Your control.
        </div>

        <div
          style={{
            fontSize: '24px',
            color: '#94A3B8',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Track expenses, manage accounts, plan budgets and build better financial habits.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

