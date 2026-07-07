// ============================================================
//  client/src/components/skeletons/index.jsx  —  Skeletons Library
// ============================================================

import React from 'react';

/**
 * Shimmering Card block. Used for stats, dashboard boxes, logs counts.
 */
export const SkeletonCard = ({ width = '100%', height = '120px', borderRadius = '12px', className = '' }) => (
  <div
    className={`skeleton-box ${className}`}
    style={{ width, height, borderRadius }}
  />
);

/**
 * Shimmering Text line placeholder.
 */
export const SkeletonText = ({ width = '100%', height = '14px', className = '' }) => (
  <div
    className={`skeleton-box ${className}`}
    style={{ width, height }}
  />
);

/**
 * A horizontal row showing simulated table cell layouts.
 */
export const SkeletonRow = ({ height = '48px', columns = 5 }) => (
  <div className="flex gap-4 items-center w-full py-3.5 border-b border-[var(--color-border-soft)]">
    {Array.from({ length: columns }).map((_, i) => (
      <SkeletonText
        key={i}
        width={i === 1 ? '40%' : '15%'}
        height="13px"
      />
    ))}
  </div>
);

/**
 * Renders a full shimmering table with header structure.
 */
export const SkeletonTable = ({ rows = 5, columns = 5 }) => (
  <div className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRow key={i} columns={columns} />
    ))}
  </div>
);

/**
 * Shimmering chart watermark representation.
 */
export const SkeletonChart = ({ height = '200px', className = '' }) => (
  <div
    className={`skeleton-box w-full flex items-center justify-center relative overflow-hidden rounded-xl border border-[var(--color-border)] ${className}`}
    style={{ height }}
  >
    <svg className="absolute opacity-[0.03] w-4/5 h-1/2" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M0,80 Q20,30 40,60 T80,10 T100,50 L100,100 L0,100 Z" fill="currentColor" />
    </svg>
  </div>
);

/**
 * Shimmering list items for Notifications or logs.
 */
export const SkeletonNotification = () => (
  <div className="flex items-center gap-3 p-3.5 border-b border-[var(--color-border-soft)]">
    <div className="skeleton-box w-8 h-8 rounded-full shrink-0" />
    <div className="flex-1 flex flex-col gap-1.5">
      <SkeletonText width="80%" height="12px" />
      <SkeletonText width="40%" height="10px" />
    </div>
  </div>
);

/**
 * Shimmering profile header block.
 */
export const SkeletonProfile = () => (
  <div className="flex items-center gap-4 py-4">
    <div className="skeleton-box w-16 h-16 rounded-full shrink-0" />
    <div className="flex-1 flex flex-col gap-2">
      <SkeletonText width="200px" height="18px" />
      <SkeletonText width="120px" height="13px" />
    </div>
  </div>
);
