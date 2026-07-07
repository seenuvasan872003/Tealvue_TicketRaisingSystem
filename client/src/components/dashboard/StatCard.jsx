import React, { memo } from 'react';

const StatCard = memo(({ label, value, color, Icon }) => {
  const colorsMap = {
    teal: { bg: 'linear-gradient(135deg, rgba(20,160,125,0.06) 0%, rgba(20,160,125,0.02) 100%)', border: 'rgba(20,160,125,0.3)', text: 'var(--color-teal)' },
    green: { bg: 'linear-gradient(135deg, rgba(63,185,80,0.06) 0%, rgba(63,185,80,0.02) 100%)', border: 'rgba(63,185,80,0.3)', text: 'var(--color-open)' },
    yellow: { bg: 'linear-gradient(135deg, rgba(210,153,34,0.06) 0%, rgba(210,153,34,0.02) 100%)', border: 'rgba(210,153,34,0.3)', text: 'var(--color-progress)' },
    gray: { bg: 'linear-gradient(135deg, rgba(110,118,129,0.06) 0%, rgba(110,118,129,0.02) 100%)', border: 'rgba(110,118,129,0.3)', text: 'var(--color-closed)' },
    red: { bg: 'linear-gradient(135deg, rgba(248,81,73,0.06) 0%, rgba(248,81,73,0.02) 100%)', border: 'rgba(248,81,73,0.3)', text: 'var(--color-high)' },
    orange: { bg: 'linear-gradient(135deg, rgba(251,146,60,0.06) 0%, rgba(251,146,60,0.02) 100%)', border: 'rgba(251,146,60,0.3)', text: '#fb923c' },
  };

  const styleSet = colorsMap[color] || colorsMap.teal;

  return (
    <div 
      className="card px-6 py-5 rounded-xl transition-all duration-200 flex flex-col justify-between gap-3" 
      style={{ 
        background: styleSet.bg, 
        border: `1px solid ${styleSet.border}`
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 8px 24px ${styleSet.border}20`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
          {label}
        </span>
        <Icon size={18} className="opacity-80" style={{ color: styleSet.text }} />
      </div>
      <div className="text-[28px] font-extrabold text-white leading-[1.1]">
        {value ?? 0}
      </div>
    </div>
  );
});

export default StatCard;
