// A small MediaRecorder hook. start() opens the mic; stop() resolves with the
// recorded Blob. While recording it exposes a live RMS level (0..1) so the waveform
// can breathe with the voice, signalling "listening", never judging.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Recorder {
  isRecording: boolean;
  level: number;
  error: string | null;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const candidate of candidates) {
    if (
      typeof MediaRecorder !== 'undefined' &&
      MediaRecorder.isTypeSupported?.(candidate)
    ) {
      return candidate;
    }
  }
  return '';
}

export function useRecorder(): Recorder {
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const resolveRef = useRef<((blob: Blob) => void) | null>(null);

  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof MediaRecorder !== 'undefined';

  // Stop only the live-metering side (RAF + AudioContext). Safe to call the moment
  // recording ends. The mic stream itself is stopped later, in onstop, so we never
  // race the recorder's final dataavailable.
  const stopMetering = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  // Release the mic stream. Called from onstop (after the blob is assembled) or on
  // unmount — never between recorder.stop() and its final dataavailable.
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopMetering();
    stopStream();
  }, [stopMetering, stopStream]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        // Release the mic only now — after every chunk, including the final one
        // flushed by stop(), has landed. Stopping the tracks earlier truncates the
        // webm and Whisper transcribes the silence as a phantom "you".
        stopStream();
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        resolveRef.current?.(blob);
        resolveRef.current = null;
      };
      // Timeslice: emit a chunk every 250ms so audio accumulates *during* recording.
      // Without it the only dataavailable is the final one at stop(), which is the
      // exact chunk most at risk of being dropped.
      recorder.start(250);
      recorderRef.current = recorder;
      setIsRecording(true);

      // Live level metering for the calm waveform.
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtor();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.fftSize);

      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const value = (buffer[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / buffer.length);
        setLevel(Math.min(1, rms * 2.2));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setError('Microphone access was blocked. You can type instead.');
      setIsRecording(false);
      cleanup();
    }
  }, [cleanup, stopStream]);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(new Blob([], { type: 'audio/webm' }));
        cleanup();
        setIsRecording(false);
        return;
      }
      resolveRef.current = resolve;
      // Flush whatever is buffered as a final chunk, then stop. onstop assembles the
      // blob and releases the mic — we only tear down metering here.
      try {
        recorder.requestData();
      } catch {
        // requestData can throw if already inactive; the stop() below still fires.
      }
      recorder.stop();
      setIsRecording(false);
      stopMetering();
    });
  }, [cleanup, stopMetering]);

  useEffect(() => cleanup, [cleanup]);

  return { isRecording, level, error, supported, start, stop };
}
