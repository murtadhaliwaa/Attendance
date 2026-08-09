"use client";

import { useEffect, useState } from "react";

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

    const update = () => {
      const next = Math.round(vv.height);
      const top = Math.round(vv.offsetTop);
      setHeight(next);
      setOffsetTop(top);
      // فرق واضح يعني أن الكيبورد (أو شريط المتصفح) قلّص المنطقة المرئية
      const inset = Math.max(0, window.innerHeight - next - top);
      setKeyboardOpen(inset > 120);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [enabled]);

  return { height, offsetTop, keyboardOpen };
}
