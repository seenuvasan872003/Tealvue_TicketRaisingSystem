import React, { useRef, useEffect } from 'react';

export default function OTPInput({ value, onChange, error, success, disabled }) {
  const inputRefs = useRef([]);

  // Ensure digits array is always 6 elements
  const digits = value || ['', '', '', '', '', ''];

  const handleChange = (index, val) => {
    // Only allow single digit
    const cleaned = val.replace(/\D/g, '').slice(-1);
    if (!cleaned) return;

    const newDigits = [...digits];
    newDigits[index] = cleaned;
    onChange(newDigits);

    // Focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const newDigits = [...digits];
      if (newDigits[index]) {
        newDigits[index] = '';
        onChange(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = '';
        onChange(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    onChange(newDigits);

    // Focus the correct input
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 md:gap-3 py-4">
      {/* Self-contained animations style block */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .otp-input-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputRefs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className={`w-11 h-13 bg-[#1a1a1a] border rounded-lg text-center text-[22px] font-medium text-[#eac253] font-mono outline-none transition-all focus:border-[#d3a73c] focus:shadow-[0_0_8px_rgba(211,167,60,0.3)] ${
            error
              ? 'border-red-400 otp-input-shake'
              : success
                ? 'border-green-400'
                : 'border-[#4b4b4b]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          style={{ width: '44px', height: '52px' }}
        />
      ))}
    </div>
  );
}
