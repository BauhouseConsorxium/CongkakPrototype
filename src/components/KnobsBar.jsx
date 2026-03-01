import { KNOB_DEFS } from '../constants';
import Knob from './Knob';

export default function KnobsBar({ knobValues, maps, learn, learnTarget, onKnobChange, onLearnClick }) {
  return (
    <div className="bg-surface-1 rounded-[10px] p-2.5">
      <div className="grid grid-cols-8 max-md:grid-cols-4 gap-[3px]">
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
    </div>
  );
}
