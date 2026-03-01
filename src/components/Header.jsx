export default function Header({ midiAccess, totalMidiMsgs, onScanMidi }) {
  const inputName = (() => {
    if (!midiAccess) return null;
    for (const [, inp] of midiAccess.inputs) {
      if (inp.state === 'connected') return inp.name;
    }
    return null;
  })();

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-[#0A0A0A] border-b border-[#333333]">
      <div>
        <div className="text-[20px] font-bold tracking-[4px] text-c2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          CONGKAK::PROTO::0.1
        </div>
      </div>
      <div className="flex items-center gap-3">
        {totalMidiMsgs > 0 && (
          <span className="font-mono text-[10px] text-dim tabular-nums">{totalMidiMsgs}</span>
        )}
        <button
          onClick={() => onScanMidi()}
          className={`font-mono text-[10px] px-3 py-1.5 rounded border cursor-pointer transition-all duration-200 tracking-[1px] flex items-center gap-1.5 ${
            inputName
              ? 'border-c4/40 text-c4 bg-c4/5'
              : 'border-[#333] text-dim bg-transparent hover:border-dim'
          }`}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
            inputName ? 'bg-c4 shadow-[0_0_6px_rgba(0,221,119,0.4)]' : 'bg-dim'
          }`} />
          {inputName || 'SCAN MIDI'}
        </button>
      </div>
    </div>
  );
}
