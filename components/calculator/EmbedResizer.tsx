"use client";
import { useEffect } from "react";

export function EmbedResizer() {
  useEffect(() => {
    const sendHeight = () => {
      if (window.parent) {
        window.parent.postMessage(
          {
            type: "payoutdelta-embed-resize",
            height: document.documentElement.scrollHeight,
          },
          "*"
        );
      }
    };

    // Send on load
    sendHeight();
    
    // Send on resize
    window.addEventListener("resize", sendHeight);
    
    // Observe DOM changes just in case
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("resize", sendHeight);
      observer.disconnect();
    };
  }, []);

  return null;
}
