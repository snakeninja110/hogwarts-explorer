import { useRef, useEffect, useState, useCallback } from 'react';
import { BabylonEngine } from './core/BabylonEngine';
import { HUD } from './components/HUD';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BabylonEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentZone, setCurrentZone] = useState('exterior');
  const [interactionHint, setInteractionHint] = useState<string | null>(null);

  const handleSceneReady = useCallback(() => {
    setLoading(false);
  }, []);

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
      onSceneReady: handleSceneReady,
      onZoneChange: handleZoneChange,
      onInteractionHint: handleInteractionHint,
    });

    engineRef.current = engine;
    engine.initialize();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleSceneReady, handleZoneChange, handleInteractionHint]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', outline: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {loading && <LoadingScreen />}
      {!loading && (
        <HUD currentZone={currentZone} interactionHint={interactionHint} />
      )}
    </div>
  );
}
