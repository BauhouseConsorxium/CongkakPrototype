import { KNOB_DEFS } from '../constants';
import Knob from './Knob';
import Panel from './Panel';

export default function KnobsBar({ knobValues, maps, learn, learnTarget, onKnobChange, onLearnClick }) {
  return (
    <Panel>
      <div className="grid grid-cols-9 max-md:grid-cols-3 gap-[3px]">
        {KNOB_DEFS.map((def, i) => (
          <Knob
            key={def.id}
            def={def}
            value={knobValues[i]}
            index={i}
            mapped={maps.knobs[i]}
            learn={learn && learnTarget?.t === 'knob' && learnTarget?.i === i}
            onValueChange={onKnobChange}
            onLearnClick={() => learn && onLearnClick('knob', i)}
          />
        ))}
      </div>
    </Panel>
  );
}
