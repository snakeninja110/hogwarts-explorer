import React from 'react';

const ZONE_NAMES: Record<string, string> = {
  exterior: '🏰 Castle Grounds',
  great_hall: '🏛️ Great Hall',
  moving_stairs: '🪜 Moving Staircases',
  room_of_requirement: '🚪 Room of Requirement',
  chamber_of_secrets: '🐍 Chamber of Secrets',
  headmaster_office: '🦅 Headmaster\'s Office',
  potions_dungeon: '🧪 Potions Dungeon',
};

interface HUDProps {
  currentZone: string;
  interactionHint: string | null;
}

export const HUD: React.FC<HUDProps> = ({ currentZone, interactionHint }) => {
  return (
    <>
      {/* Crosshair */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 4,
        height: 4,
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        boxShadow: '0 0 6px rgba(255, 255, 255, 0.3)',
        pointerEvents: 'none',
      }} />

      {/* Zone name */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: '#d4af37',
        fontFamily: '"Georgia", serif',
        fontSize: 18,
        textShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
        pointerEvents: 'none',
      }}>
        {ZONE_NAMES[currentZone] ?? currentZone}
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'monospace',
        fontSize: 12,
        pointerEvents: 'none',
      }}>
        WASD to move · Mouse to look · Click to capture cursor
      </div>

      {/* Interaction hint */}
      {interactionHint && (
        <div style={{
          position: 'absolute',
          bottom: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ffd700',
          fontFamily: '"Georgia", serif',
          fontSize: 16,
          textShadow: '0 0 15px rgba(255, 215, 0, 0.6)',
          padding: '8px 20px',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          pointerEvents: 'none',
          animation: 'pulse 2s infinite',
        }}>
          {interactionHint}
        </div>
      )}
    </>
  );
};
