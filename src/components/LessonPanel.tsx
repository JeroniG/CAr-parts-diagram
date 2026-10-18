import { Pause, Play, RotateCcw, X, ChevronRight, GraduationCap, ExternalLink } from 'lucide-react';
import { mechanismState, shiftSteps } from '../scene/animations/transmission';
import { sources } from '../data/catalog';
export function LessonPanel({
  progress,
  playing,
  speed,
  loop,
  onProgress,
  onPlaying,
  onSpeed,
  onLoop,
  onClose,
}: {
  progress: number;
  playing: boolean;
  speed: number;
  loop: boolean;
  onProgress: (n: number) => void;
  onPlaying: (n: boolean) => void;
  onSpeed: (n: number) => void;
  onLoop: (n: boolean) => void;
  onClose: () => void;
}) {
  const { step } = mechanismState(progress);
  return (
    <aside className="inspector lesson-panel" aria-label="Transmission lesson">
      <div className="panel-heading">
        <span>MECHANISM LAB</span>
        <button className="icon-button" onClick={onClose} aria-label="Close lesson">
          <X size={17} />
        </button>
      </div>
      <div className="inspector-title">
        <div className="inspector-symbol">
          <GraduationCap size={26} />
        </div>
        <span className="eyebrow">A CLOSER LOOK</span>
        <h2>
          A gear change,
          <br />
          understood.
        </h2>
        <p>The 451 automated manual transmission</p>
      </div>
      <div className="lesson-content">
        <div className="tier-badge">
          Tier C<span />
          Conceptual animation
        </div>
        <p className="intro-copy">
          An automated manual uses a clutch, just like a manual gearbox. Electronic actuators do the
          shifting.
        </p>
        <div className="lesson-steps">
          {shiftSteps.map(([name, description], i) => (
            <button
              key={name}
              className={step === i ? 'active' : ''}
              onClick={() => {
                onPlaying(false);
                onProgress((i + 0.12) / 6);
              }}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <strong>{name}</strong>
                {step === i && <p>{description}</p>}
              </div>
              {step === i && <ChevronRight size={16} />}
            </button>
          ))}
        </div>
        <div className="lesson-playback">
          <div>
            <button
              className="play-button"
              aria-label={playing ? 'Pause animation' : 'Play animation'}
              onClick={() => {
                if (progress >= 1) onProgress(0);
                onPlaying(!playing);
              }}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button
              className="icon-button"
              aria-label="Restart animation"
              onClick={() => onProgress(0)}
            >
              <RotateCcw size={16} />
            </button>
            <span>{Math.round(progress * 100)}%</span>
            <select
              aria-label="Animation speed"
              value={speed}
              onChange={(e) => onSpeed(Number(e.target.value))}
            >
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
              <option value="2">2×</option>
            </select>
          </div>
          <input
            type="range"
            aria-label="Animation timeline"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={(e) => {
              onPlaying(false);
              onProgress(Number(e.target.value));
            }}
          />
          <label className="checkbox-label">
            <input type="checkbox" checked={loop} onChange={(e) => onLoop(e.target.checked)} />
            Loop animation
          </label>
        </div>
        <div className="inspector-note">
          <GraduationCap size={18} />
          <span>
            Linkage shape, travel and timing are illustrative. The housing is transparent to reveal
            the clutch. Gear selection is explained in text; internal gears are not modeled.
          </span>
        </div>
        <a
          className="inline-source"
          href={sources.find((s) => s.id === 'zf-actuators')!.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Technical context · ZF Aftermarket <ExternalLink size={12} />
        </a>
      </div>
    </aside>
  );
}
