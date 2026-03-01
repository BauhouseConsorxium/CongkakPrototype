import { KNOB_DEFS } from '../constants';

const tabs = [
  { id: 'dev', label: 'DEV' },
  { id: 'map', label: 'MAP' },
  { id: 'log', label: 'LOG' },
];

export default function Sidebar({
  activeTab, logs, maps, learn, midiAccess,
  onTabChange, onScanMidi, onToggleLearn, onClearMaps, onSaveMaps, onLoadMaps,
  onClearMapKnob, onClearMapPad, onClearLogs, onCollapse,
}) {
  return (
    <div className="border-l border-surface-2 bg-surface-1 flex flex-col max-h-[calc(100vh-60px)] max-md:max-h-none">
      <div className="flex border-b border-surface-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-2.5 text-[11px] tracking-[1.5px] uppercase text-center cursor-pointer font-mono transition-all duration-200 border-b-2 ${
              activeTab === tab.id
                ? 'text-c3 border-c3'
                : 'text-dim border-transparent hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={onCollapse}
          className="px-2.5 py-2.5 text-[11px] text-dim hover:text-c3 cursor-pointer font-mono transition-colors duration-150 border-b-2 border-transparent"
          title="Collapse sidebar"
        >
          {'▸'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'dev' && (
          <DevPanel midiAccess={midiAccess} onScanMidi={onScanMidi} />
        )}
        {activeTab === 'map' && (
          <MapPanel
            maps={maps} learn={learn}
            onToggleLearn={onToggleLearn} onClearMaps={onClearMaps}
            onSaveMaps={onSaveMaps} onLoadMaps={onLoadMaps}
            onClearMapKnob={onClearMapKnob} onClearMapPad={onClearMapPad}
          />
        )}
        {activeTab === 'log' && (
          <LogPanel logs={logs} onClear={onClearLogs} />
        )}
      </div>
    </div>
  );
}

function DevPanel({ midiAccess, onScanMidi }) {
  const inputs = midiAccess ? Array.from(midiAccess.inputs.values()) : [];
  const outputs = midiAccess ? Array.from(midiAccess.outputs.values()) : [];

  return (
    <div>
      <InfoBox>
        <b className="text-c3">Download &amp; open in Chrome</b> for MIDI.<br />
        Mappings auto-save to localStorage.
      </InfoBox>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <Btn primary onClick={() => onScanMidi(false)}>SCAN</Btn>
        <Btn onClick={() => onScanMidi(true)}>+SYSEX</Btn>
      </div>
      <SectionTitle>INPUTS <span className="text-c4">({inputs.length})</span></SectionTitle>
      {inputs.length === 0 ? (
        <EmptyState>Click SCAN</EmptyState>
      ) : (
        inputs.map(inp => (
          <DeviceCard key={inp.id} name={inp.name} manufacturer={inp.manufacturer} live />
        ))
      )}
      <SectionTitle>OUTPUTS <span className="text-dim">({outputs.length})</span></SectionTitle>
      {outputs.length === 0 ? (
        <EmptyState>{'\u2014'}</EmptyState>
      ) : (
        outputs.map(out => (
          <DeviceCard key={out.id} name={out.name} manufacturer={out.manufacturer} />
        ))
      )}
    </div>
  );
}

function MapPanel({ maps, learn, onToggleLearn, onClearMaps, onSaveMaps, onLoadMaps, onClearMapKnob, onClearMapPad }) {
  return (
    <div>
      <SectionTitle>MIDI LEARN</SectionTitle>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <Btn className={learn ? 'border-c1 bg-[rgba(255,68,68,0.1)] text-c1' : ''} onClick={onToggleLearn}>LEARN</Btn>
        <Btn onClick={onClearMaps}>CLEAR</Btn>
        <Btn primary onClick={onSaveMaps}>SAVE</Btn>
        <Btn onClick={onLoadMaps}>LOAD</Btn>
      </div>
      <InfoBox>
        <b className="text-c3">Learn:</b> LEARN &rarr; click control &rarr; move M-Wave.<br />
        <b className="text-c3">Auto:</b> 8 knobs then 16 pads.
      </InfoBox>
      <SectionTitle>KNOBS</SectionTitle>
      {KNOB_DEFS.map((d, i) => (
        <MappingItem
          key={d.id}
          icon={'\uD83C\uDFDB'}
          label={d.lbl}
          mapped={maps.knobs[i]}
          mapLabel={maps.knobs[i] !== null ? `CC${maps.knobs[i]}` : null}
          onClear={() => onClearMapKnob(i)}
        />
      ))}
      <SectionTitle>PADS</SectionTitle>
      {Array.from({ length: 16 }, (_, i) => (
        <MappingItem
          key={i}
          icon={'\uD83C\uDFB9'}
          label={`P${i + 1}`}
          mapped={maps.pads[i]}
          mapLabel={maps.pads[i] !== null ? `N${maps.pads[i]}` : null}
          onClear={() => onClearMapPad(i)}
        />
      ))}
    </div>
  );
}

function LogPanel({ logs, onClear }) {
  return (
    <div>
      <SectionTitle>LOG</SectionTitle>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <Btn small onClick={onClear}>CLR</Btn>
      </div>
      <div className="bg-black/30 rounded p-2 font-mono text-[11px] text-dim h-[220px] overflow-y-auto leading-relaxed">
        {logs.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="text-[11px] tracking-[2px] text-dim mb-2 pb-1 border-b border-surface-2 font-mono uppercase">
      {children}
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="p-2.5 bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.08)] rounded-md text-[11px] text-dim leading-relaxed mb-3 font-mono">
      {children}
    </div>
  );
}

function Btn({ children, primary, small, className = '', onClick }) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[11px] px-3 py-1.5 border border-[#4A4A4A] bg-surface-2 text-text cursor-pointer tracking-[1px] uppercase rounded transition-all duration-200 whitespace-nowrap hover:border-c3 ${
        primary ? 'border-c4 text-c4' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ children }) {
  return (
    <div className="p-3 text-center text-dim text-[11px] border border-dashed border-surface-2 rounded-md leading-relaxed font-mono mb-3">
      {children}
    </div>
  );
}

function DeviceCard({ name, manufacturer, live }) {
  return (
    <div className={`p-2.5 bg-white/[.02] border rounded-md mb-1.5 font-mono ${live ? 'border-c4' : 'border-surface-2'}`}>
      <div className="font-semibold text-text text-[13px] mb-0.5">{name}</div>
      <div className="text-dim text-[11px] leading-relaxed">Mfr: {manufacturer || '\u2014'}</div>
    </div>
  );
}

function MappingItem({ icon, label, mapped, mapLabel, onClear }) {
  return (
    <div className="flex justify-between items-center px-2.5 py-1 bg-white/[.02] border border-surface-2 rounded text-[11px] mb-1 font-mono">
      <span className="text-text">{icon} {label}</span>
      {mapLabel ? (
        <span>
          <span className="text-c4 font-semibold">{mapLabel}</span>
          <button onClick={onClear} className="bg-transparent border-none text-c1 cursor-pointer text-xs opacity-50 hover:opacity-100 ml-1.5">
            {'\u2715'}
          </button>
        </span>
      ) : (
        <span className="text-dim italic">{'\u2014'}</span>
      )}
    </div>
  );
}
