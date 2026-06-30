"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// 预设音效类型
export type SoundPreset = "ding-dong" | "soft-chime" | "crystal" | "gentle-bell" | "notification";

// 音效描述
export const SOUND_PRESETS: { id: SoundPreset; label: string }[] = [
  { id: "ding-dong", label: "叮咚" },
  { id: "soft-chime", label: "柔和风铃" },
  { id: "crystal", label: "水晶" },
  { id: "gentle-bell", label: "轻铃" },
  { id: "notification", label: "通知" },
];

export function useAudio() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("pi-sound-enabled");
    return stored === null ? true : stored === "true";
  });

  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("pi-sound-enabled", String(next));
      return next;
    });
  }, []);

  const [soundPreset, setSoundPreset] = useState<SoundPreset>(() => {
    if (typeof window === "undefined") return "ding-dong";
    return (localStorage.getItem("pi-sound-preset") as SoundPreset) || "ding-dong";
  });

  const togglePreset = useCallback((preset: SoundPreset) => {
    setSoundPreset(preset);
    localStorage.setItem("pi-sound-preset", preset);
  }, []);

  const playDone = useCallback(() => {
    if (!enabledRef.current) return;
    try {
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      const presets: Record<SoundPreset, () => void> = {
        "ding-dong": () => {
          // 原有：C5 + E5 双音
          [523.25, 659.25].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freq;
            const t = now + i * 0.18;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            osc.start(t);
            osc.stop(t + 0.45);
          });
        },
        "soft-chime": () => {
          // 柔和风铃：E5 → G#5 → B5，三角波，渐弱
          [659.25, 830.61, 987.77].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "triangle";
            osc.frequency.value = freq;
            const t = now + i * 0.12;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            osc.start(t);
            osc.stop(t + 0.6);
          });
        },
        "crystal": () => {
          // 水晶：高频正弦波 + 泛音，清脆
          [1318.51, 1567.98, 2093.00].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freq;
            const t = now + i * 0.08;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            osc.start(t);
            osc.stop(t + 0.35);
          });
        },
        "gentle-bell": () => {
          // 轻铃：D5 → F#5，钟声音色
          [587.33, 739.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freq;
            const t = now + i * 0.2;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            osc.start(t);
            osc.stop(t + 0.8);
          });
        },
        "notification": () => {
          // 通知：快速三连音 G5 → E5 → G5
          [783.99, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freq;
            const t = now + i * 0.1;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
          });
        },
      };

      presets[soundPreset]();
      setTimeout(() => ctx.close(), 1200);
    } catch {
      // AudioContext not available
    }
  }, [soundPreset]);

  return {
    soundEnabled: enabled,
    onSoundToggle: toggle,
    playDoneSound: playDone,
    soundEnabledRef: enabledRef,
    soundPreset,
    onSoundPresetChange: togglePreset,
  };
}