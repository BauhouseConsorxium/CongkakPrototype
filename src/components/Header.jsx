export default function Header({ midiAccess, totalMidiMsgs, onScanMidi }) {
  const inputName = (() => {
    if (!midiAccess) return null;
    for (const [, inp] of midiAccess.inputs) {
      if (inp.state === 'connected') return inp.name;
    }
    return null;
  })();

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b-[3px] border-c5 bg-gradient-to-br from-[#141020] to-[#201535]">
      <div>
        <div className="text-[28px] font-bold tracking-[3px] bg-gradient-to-br from-c1 via-c2 to-c3 bg-clip-text text-transparent">
          GLITCH::DUO
        </div>
        <span className="block text-[11px] font-normal tracking-[5px] text-dim font-mono">
          SEQUENCER SYNTH
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-dim">{totalMidiMsgs}</span>
        <button
          onClick={() => onScanMidi()}
          className={`font-mono text-xs px-4 py-2 rounded-[20px] tracking-[1px] border cursor-pointer transition-all duration-200 ${
            inputName
              ? 'border-c4 text-c4 shadow-[0_0_12px_rgba(119,255,68,0.2)] bg-surface-1'
              : 'border-[#333] text-dim bg-surface-1'
          }`}
        >
          {inputName ? `● ${inputName}` : '● SCAN MIDI'}
        </button>
      </div>
    </div>
  );
}
