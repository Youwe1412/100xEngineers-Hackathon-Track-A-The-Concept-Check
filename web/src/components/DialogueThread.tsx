import { useEffect, useRef } from 'react';
import type { Turn } from '../state/useDiagnostic.ts';
import { LearnerTurn } from './LearnerTurn.tsx';
import { SystemTurn } from './SystemTurn.tsx';

interface DialogueThreadProps {
  turns: Turn[];
}

// A single calm vertical thread. Proximity and generous spacing make it read as one
// reflective conversation rather than a rapid chat. Autoscrolls to the newest turn.
export function DialogueThread({ turns }: DialogueThreadProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length]);

  return (
    <div className="flex flex-col gap-8">
      {turns.map((turn) =>
        turn.role === 'learner' ? (
          <LearnerTurn key={turn.id} text={turn.text} />
        ) : (
          <SystemTurn
            key={turn.id}
            kind={turn.kind === 'reflection' ? 'reflection' : 'question'}
            text={turn.text}
          />
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}
