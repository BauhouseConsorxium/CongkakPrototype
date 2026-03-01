import { MODE_NAMES, MODE_DESCS } from '../constants';

const chipColors = [
  { text: 'text-c1', active: 'bg-c1 text-bg border-c1' },
  { text: 'text-c3', active: 'bg-c3 text-bg border-c3' },
  { text: 'text-c2', active: 'bg-c2 text-bg border-c2' },
  { text: 'text-c4', active: 'bg-c4 text-bg border-c4' },
];

export default function ModeBar({ mode, onSetMode }) {
  return (
    <div className="flex gap-2 items-center p-2.5 px-3.5 bg-surface-1 rounded-[10px] border-2 border-surface-2">
      {MODE_NAMES.map((name, i) => (
        <button
          key={i}
          onClick={() => onSetMode(i)}
          className={`px-4 py-2 rounded-md text-[13px] font-bold tracking-[2px] font-mono transition-all duration-150 border ${
            i === mode
              ? `${chipColors[i].active} opacity-100 shadow-[0_0_16px_rgba(255,255,255,0.08)]`
              : `${chipColors[i].text} opacity-40 border-transparent`
          }`}
        >
          {name}
        </button>
      ))}
      <div className="flex-1 text-right text-[11px] text-dim font-mono">
        {MODE_DESCS[mode]}
      </div>
    </div>
  );
}
