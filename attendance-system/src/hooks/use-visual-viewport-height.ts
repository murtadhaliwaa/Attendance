"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * يتتبع الارتفاع المرئي الفعلي (فوق لوحة المفاتيح على الموبايل)
 * حتى تتحرك صفحة الكشك مع الكيبورد بدل أن يُغطّى الحقل.
 */
export function useVisualViewportHeight(enabled: boolean) {
  const [height, setHeight] = useState<number | null>(null);
  const [offsetTop, setOffsetTop] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) return;

    let frame = 0;

    const apply = () => {
      frame = 0;
      const next = Math.round(vv.height);
      const top = Math.round(vv.offsetTop);
      setHeight(next);
      setOffsetTop(top);
      const inset = Math.max(0, window.innerHeight - next - top);
      setKeyboardOpen(inset > 120);
    };

    // تجميع أحداث resize/scroll في إطار رسم واحد يقلّل اهتزاز التخطيط
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [enabled]);

  return { height, offsetTop, keyboardOpen };
}

const KeyboardOpenContext = createContext(false);

/** يشارك حالة الكيبورد من غلاف الكشك حتى لا يتكرر مستمع visualViewport */
export const KeyboardOpenProvider = KeyboardOpenContext.Provider;

export function useKeyboardOpen() {
  return useContext(KeyboardOpenContext);
}
