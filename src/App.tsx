import { useRef, useEffect, useState, useCallback } from 'react';
import { BabylonEngine, type ViewMode } from './core/BabylonEngine';
import { HUD } from './components/HUD';
import { LoadingScreen } from './components/LoadingScreen';

const STARTUP_TIMEOUT_MS = 30_000;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BabylonEngine | null>(null);
  const [startup, setStartup] = useState<'loading' | 'ready' | 'error'>('loading');
  const [currentZone, setCurrentZone] = useState('exterior');
  const [interactionHint, setInteractionHint] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('walk');

  const handleZoneChange = useCallback((zone: string) => {
    setCurrentZone(zone);
  }, []);

  const handleInteractionHint = useCallback((hint: string | null) => {
    setInteractionHint(hint);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BabylonEngine(canvas, {
      onZoneChange: handleZoneChange,
      onInteractionHint: handleInteractionHint,
      onViewChange: setView,
    });

    engineRef.current = engine;
    const stopEngine = () => {
      window.clearTimeout(startupTimeout);
      if (engineRef.current === engine) {
        engineRef.current = null;
        engine.dispose();
      }
    };
    const handleStartupError = (error: unknown) => {
      if (engineRef.current !== engine) return;
      console.error('[Hogwarts] Castle startup failed:', error);
      setStartup('error');
      stopEngine();
    };
    const startupTimeout = window.setTimeout(() => {
      handleStartupError(new Error('The 3D scene did not become ready in time.'));
    }, STARTUP_TIMEOUT_MS);

    void engine.initialize().then(() => {
      if (engineRef.current !== engine) return;
      window.clearTimeout(startupTimeout);
      setStartup('ready');
    }, handleStartupError);

    return stopEngine;
  }, [handleZoneChange, handleInteractionHint]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', outline: 'none', cursor: view === 'walk' ? undefined : 'grab' }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {startup !== 'ready' && <LoadingScreen failed={startup === 'error'} />}
      {startup === 'ready' && (
        <HUD
          currentZone={currentZone}
          interactionHint={interactionHint}
          view={view}
          onToggleOverview={() => { void engineRef.current?.toggleOverview(); }}
          onToggleLakeView={() => { void engineRef.current?.toggleLakeView(); }}
          onToggleLakeLight={() => { engineRef.current?.toggleLakeLight(); }}
        />
      )}
    </div>
  );
}
