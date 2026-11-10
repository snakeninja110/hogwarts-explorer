import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: '#0a0a14',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      {/* Title */}
      <h1 style={{
        color: '#d4af37',
        fontFamily: '"Georgia", serif',
        fontSize: 48,
        letterSpacing: 4,
        textShadow: '0 0 30px rgba(212, 175, 55, 0.4)',
        marginBottom: 8,
      }}>
        HOGWARTS
      </h1>
      <p style={{
        color: 'rgba(212, 175, 55, 0.6)',
        fontFamily: '"Georgia", serif',
        fontSize: 16,
        letterSpacing: 8,
        marginBottom: 60,
      }}>
        EXPLORER
      </p>

      {/* Loading bar */}
      <div style={{
        width: 300,
        height: 2,
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        borderRadius: 1,
        overflow: 'hidden',
      }}>
        <div style={{
          width: '40%',
          height: '100%',
          backgroundColor: '#d4af37',
          borderRadius: 1,
          animation: 'loadingSlide 1.5s ease-in-out infinite',
        }} />
      </div>

      <p style={{
        color: 'rgba(255, 255, 255, 0.35)',
        fontFamily: '"Georgia", serif',
        fontSize: 13,
        marginTop: 20,
      }}>
        Preparing the castle...
      </p>

      <style>{`
        @keyframes loadingSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(375%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};
