// ============================================================
//  client/src/components/LoginLoader.jsx  —  Branded Login Loader
// ============================================================

import { useEffect, useState } from 'react';
import tealvueLogo from '../assets/tealvue1.png';

const LoginLoader = ({ progress = 0, statusText = 'Loading...', visible = false }) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setFadeOut(false);
    } else if (shouldRender) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999] transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center select-none text-center px-6">
        {/* Logo Section */}
        <div className="mb-6 flex justify-center">
          <img src={tealvueLogo} alt="Tealvue Logo" className="h-[120px] w-[120px] object-contain drop-shadow-[0_0_15px_rgba(234,194,83,0.3)]" />
        </div>

        {/* Brand Text */}
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-normal bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Tealvue
        </h1>

        {/* Loading Bar */}
        <div className="w-[280px] sm:w-[360px] h-[6px] bg-zinc-900 rounded-full overflow-hidden mt-8 mb-4 relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(234,194,83,0.5)]"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #c3862b, #eac253, #bd7e2b)'
            }}
          />
        </div>

        {/* Loading Percentage, Tagline & Status Text (Under the loading bar) */}
        <div className="flex flex-col gap-2 items-center">
          <span className="text-lg sm:text-xl text-[var(--color-teal)] font-bold tracking-wider">
            {progress}%
          </span>
          <p className="text-base sm:text-lg text-zinc-300 font-medium tracking-wide">
            Ticket Management Platform
          </p>
          <p className="text-sm sm:text-base text-zinc-400 font-semibold tracking-wide min-h-[24px] transition-all duration-150 max-w-[280px] sm:max-w-[400px]">
            {statusText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginLoader;
