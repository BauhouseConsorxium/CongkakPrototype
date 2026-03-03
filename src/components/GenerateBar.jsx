import { useState, useCallback } from 'react';
import { AI_VIBES } from '../constants';
import { getApiKey, generateScene, applyScene } from '../ai-scene';
import Panel from './Panel';

export default function GenerateBar({ state, dispatch, setBpm, log }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeVibe, setActiveVibe] = useState(null);

  const handleGenerate = useCallback(async (vibe) => {
    setLoading(true);
    setError(null);
    setActiveVibe(vibe.n);
    log('Generating ' + vibe.n + '...');

    try {
      const scene = await generateScene(getApiKey(), state, vibe);
      applyScene(dispatch, scene, setBpm);
    } catch (e) {
      setError(e.message);
      log('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [state, dispatch, setBpm, log]);

  return (
    <Panel className="flex flex-col gap-2 px-3.5 border-2 border-surface-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[10px] tracking-[1px] text-c6 shrink-0">GENERATE</span>
        {AI_VIBES.map((vibe) => (
          <button
            key={vibe.n}
            onClick={() => handleGenerate(vibe)}
            disabled={loading}
            className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold tracking-[1.5px] font-mono transition-all duration-150 border cursor-pointer ${
              activeVibe === vibe.n && loading
                ? 'bg-c6 text-bg border-c6 opacity-100 animate-pulse'
                : 'text-c6 opacity-50 border-transparent hover:opacity-80 hover:border-c6/30'
            } ${loading ? 'pointer-events-none' : ''}`}
            title={vibe.desc}
          >
            {vibe.n}
          </button>
        ))}
      </div>

      {error && (
        <div className="font-mono text-[10px] text-c1">{error}</div>
      )}
    </Panel>
  );
}
