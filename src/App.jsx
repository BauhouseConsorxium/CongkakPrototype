import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from './store';
import { initAudio } from './audio';
import { KEY_MAP, TRACKS } from './constants';
import Header from './components/Header';
import ModeBar from './components/ModeBar';
import TrackBar from './components/TrackBar';
import Transport from './components/Transport';
import EuclideanRing from './components/EuclideanRing';
import LcdDisplay from './components/LcdDisplay';
import Waveform from './components/Waveform';
import SampleEditor from './components/SampleEditor';
import KnobsBar from './components/KnobsBar';
import PadsGrid from './components/PadsGrid';
import Sidebar from './components/Sidebar';
import GenerateBar from './components/GenerateBar';

export default function App() {
  const { state, actions, stateRef } = useStore();
  const [showPads, setShowPads] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Keyboard shortcuts - use refs to avoid re-attaching on every state change
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.repeat) return;
      const s = stateRef.current;
      const a = actionsRef.current;
      if (e.key === ' ') { e.preventDefault(); a.togglePlay(); return; }
      if (e.key === 'Tab') { e.preventDefault(); a.setMode((s.mode + 1) % 4); return; }
      if (e.key === 'ArrowUp') { a.setTrack(Math.max(0, s.selTrack - 1)); return; }
      if (e.key === 'ArrowDown') { a.setTrack(Math.min(7, s.selTrack + 1)); return; }
      const i = KEY_MAP[e.key.toLowerCase()];
      if (i !== undefined) a.triggerPad(i);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stateRef]);

  // Init audio on first click
  useEffect(() => {
    const handler = () => initAudio();
    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, []);

  // Auto-scan MIDI - run once
  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      actionsRef.current.log('WebMIDI available');
      const t = setTimeout(() => actionsRef.current.scanMidi(), 300);
      return () => clearTimeout(t);
    } else {
      actionsRef.current.log('No WebMIDI');
    }
  }, []);

  const handleLearnClick = useCallback((type, index) => {
    actionsRef.current.setLearnTarget({ t: type, i: index });
  }, []);

  return (
    <div className="min-h-screen">
      <Header
        midiAccess={state.midiAccess}
        totalMidiMsgs={state.totalMidiMsgs}
        onScanMidi={actions.scanMidi}
      />

      <div className={`grid ${showSidebar ? 'grid-cols-[1fr_320px]' : 'grid-cols-1'} max-md:grid-cols-1 min-h-[calc(100vh-52px)]`}>
        <div className="p-3.5 flex flex-col gap-2.5">
          <ModeBar mode={state.mode} onSetMode={actions.setMode} />
          <TrackBar selTrack={state.selTrack} onSetTrack={actions.setTrack} samples={state.samples} />
          <Transport
            playing={state.playing}
            bpm={state.bpm}
            onTogglePlay={actions.togglePlay}
            onStop={actions.stop}
            onSetBpm={actions.setBpm}
          />
          <GenerateBar
            state={state}
            dispatch={actions.dispatch}
            setBpm={actions.setBpm}
            log={actions.log}
          />
          <div className="flex gap-3 items-stretch justify-center flex-wrap">
            <div className="shrink-0" style={{ width: 128 * 3 + 12 }}>
            <EuclideanRing
              seq={state.seq}
              curStep={state.curStep}
              selTrack={state.selTrack}
              euclidean={state.euclidean}
              curPatName={state.curPatName}
              bpm={state.bpm}
              onToggleStep={(step) => actions.dispatch({ type: 'TOGGLE_STEP', step })}
              onSelectTrack={actions.setTrack}
            />
            </div>
            <div className="shrink-0 flex flex-col items-center p-[6px] rounded-lg bg-[#050d05] border border-[#1a2e1a] shadow-[inset_0_1px_4px_rgba(0,0,0,0.6),0_0_12px_rgba(0,255,136,0.03)]" style={{ width: 128 * 3 + 12 }}>
              <LcdDisplay state={state} />
              <div className="flex-1 flex items-center w-full px-1">
                <div className="w-full">
                  <Waveform />
                </div>
              </div>
              <div className="w-full px-1 pb-1">
                <SampleEditor
                  trackIndex={state.selTrack}
                  trackColor={TRACKS[state.selTrack].col}
                  trackName={TRACKS[state.selTrack].id}
                  sample={state.samples[state.selTrack]}
                  recording={state.recording}
                  onStartRec={actions.startRec}
                  onStopRec={actions.stopRec}
                  onClearSample={actions.clearSample}
                  onLoadFile={actions.loadSampleFile}
                  onSetRegion={actions.setSampleRegion}
                />
              </div>
            </div>
          </div>
          <KnobsBar
            knobValues={state.knobValues}
            maps={state.maps}
            learn={state.learn}
            learnTarget={state.learnTarget}
            onKnobChange={actions.setKnobValue}
            onLearnClick={handleLearnClick}
          />
          <button
            onClick={() => setShowPads(p => !p)}
            className="font-mono text-[10px] tracking-[1px] text-dim hover:text-text transition-colors duration-150 self-start px-1 py-0.5"
          >
            {showPads ? '▾ HIDE PADS' : '▸ SHOW PADS'}
          </button>
          {showPads && (
            <PadsGrid
              mode={state.mode}
              selTrack={state.selTrack}
              seq={state.seq}
              activePatPerTrack={state.activePatPerTrack}
              maps={state.maps}
              learn={state.learn}
              onTriggerPad={actions.triggerPad}
              onLearnClick={handleLearnClick}
            />
          )}
        </div>

        {showSidebar ? (
          <Sidebar
            activeTab={state.sidebarTab}
            logs={state.logs}
            maps={state.maps}
            learn={state.learn}
            midiAccess={state.midiAccess}
            onTabChange={actions.setSidebarTab}
            onScanMidi={actions.scanMidi}
            onToggleLearn={actions.toggleLearn}
            onClearMaps={actions.clearAllMaps}
            onSaveMaps={actions.saveMaps}
            onLoadMaps={actions.loadMaps}
            onClearMapKnob={actions.clearMapKnob}
            onClearMapPad={actions.clearMapPad}
            onClearLogs={actions.clearLogs}
            onCollapse={() => setShowSidebar(false)}
          />
        ) : (
          <button
            onClick={() => setShowSidebar(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-10 bg-surface-1 border border-surface-2 border-r-0 rounded-l-md px-1 py-3 font-mono text-[10px] text-dim hover:text-c3 cursor-pointer transition-colors duration-150"
            title="Show sidebar"
          >
            {'◂'}
          </button>
        )}
      </div>
    </div>
  );
}
