import React from 'react';
import type { ViewMode } from '../core/BabylonEngine';

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
  view: ViewMode;
  onToggleOverview: () => void;
  onToggleLakeView: () => void;
  onToggleLakeLight: () => void;
}

const viewButton: React.CSSProperties = {
  minHeight: 44,
  padding: '0 12px',
  color: '#f1d99c',
  backgroundColor: '#151827',
  border: '1px solid #806b43',
  borderRadius: 6,
  font: '14px Georgia, serif',
  cursor: 'pointer',
};

export const HUD: React.FC<HUDProps> = ({ currentZone, interactionHint, view, onToggleOverview, onToggleLakeView, onToggleLakeLight }) => {
  const overview = view !== 'walk';
  const lake = view === 'lake-day' || view === 'lake-night';
  return (
    <>
      {/* Crosshair */}
      {!overview && (
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
      )}

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
        {lake ? 'Black Lake' : overview ? '🏰 Castle Overview' : ZONE_NAMES[currentZone] ?? currentZone}
      </div>

      <div style={{ position: 'absolute', top: 12, right: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" onClick={onToggleOverview} aria-keyshortcuts="V" style={viewButton}>
          {overview ? 'Return to Walk' : 'Castle Overview'} <kbd>V</kbd>
        </button>
        {(currentZone === 'exterior' || overview) && (
          <button type="button" onClick={onToggleLakeView} style={viewButton}>
            {lake ? 'Castle Only' : 'Lake View'}
          </button>
        )}
        {lake && (
          <button type="button" onClick={onToggleLakeLight} style={viewButton}>
            {view === 'lake-day' ? 'Moonlight' : 'Daylight'}
          </button>
        )}
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        color: overview ? '#e6dfce' : 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'monospace',
        fontSize: 12,
        pointerEvents: 'none',
      }}>
        {overview
          ? 'Drag to orbit · Scroll or pinch to zoom · Right-drag or two fingers to pan'
          : 'WASD to move · Mouse to look · [E] Door · [1] Grounds · [2] Great Hall'}
      </div>

      {/* Interaction hint */}
      {!overview && interactionHint && (
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
