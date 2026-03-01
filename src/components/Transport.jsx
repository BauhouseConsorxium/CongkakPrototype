import Panel from './Panel';

export default function Transport({ playing, bpm, onTogglePlay, onStop, onSetBpm }) {
  return (
    <Panel className="flex items-center gap-3 px-3.5">
      <button
        onClick={onTogglePlay}
        className={`w-10 h-10 rounded-full border-2 border-c4 flex items-center justify-center text-base cursor-pointer transition-all duration-150 ${
          playing ? 'bg-c4 text-bg' : 'text-c4 bg-transparent hover:bg-c4 hover:text-bg'
        }`}
      >
        {playing ? '\u275A\u275A' : '\u25B6'}
      </button>
      <button
        onClick={onStop}
        className="w-10 h-10 rounded-full border-2 border-c1 text-c1 bg-transparent flex items-center justify-center text-base cursor-pointer transition-all duration-150 hover:bg-[rgba(255,68,68,0.15)]"
      >
        {'\u25A0'}
      </button>
      <div className="text-center">
        <div className="font-mono text-3xl font-bold text-c2 min-w-[65px] text-center">{bpm}</div>
        <div className="text-[9px] text-dim tracking-[2px]">BPM</div>
      </div>
      <input
        type="range"
        min="40"
        max="300"
        value={bpm}
        onChange={(e) => onSetBpm(+e.target.value)}
        className="flex-1"
      />
    </Panel>
  );
}
