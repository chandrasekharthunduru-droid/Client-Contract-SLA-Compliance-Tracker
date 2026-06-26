import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Scroll & Load Reveal Animation Engine ────────────────────
const registerScrollReveal = () => {
  let delay = 0;
  let lastTimestamp = 0;

  const observer = new IntersectionObserver(
    (entries) => {
      const now = performance.now();
      // If multiple elements trigger at the same time, stagger them
      if (now - lastTimestamp > 50) {
        delay = 0;
      }
      lastTimestamp = now;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add('reveal-visible');
          observer.unobserve(el);
          delay += 60; // 60ms staggered gap
        }
      });
    },
    {
      threshold: 0.02,
      rootMargin: '0px 0px -30px 0px', // trigger slightly before entering viewport
    }
  );

  const observeElements = () => {
    // Find all cards, tables, headers, and explicit reveal targets that haven't been revealed yet
    const targets = document.querySelectorAll(
      '.card:not(.reveal-visible):not(.no-reveal), .table-wrapper:not(.reveal-visible):not(.no-reveal), .page-header:not(.reveal-visible):not(.no-reveal), .reveal:not(.reveal-visible):not(.no-reveal)'
    );
    targets.forEach((el) => observer.observe(el));
  };

  // Monitor the DOM for dynamic additions (e.g. page changes, tab switching)
  const mutationObserver = new MutationObserver(() => {
    observeElements();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Run initial observation pass
  observeElements();
};

// Start reveal observer after window loads or starts
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    registerScrollReveal();
  } else {
    window.addEventListener('DOMContentLoaded', registerScrollReveal);
  }
}

