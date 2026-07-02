const fs = require('fs');
let code = fs.readFileSync('E:/Tealvue-task/client/src/pages/RolesFeatures.jsx', 'utf8');

// UserAvatar
code = code.replace(
  /style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid var\(--color-border\)', flexShrink: 0 }}/g,
  'className="w-[38px] h-[38px] rounded-full object-cover border-2 border-[var(--color-border)] shrink-0"'
);
code = code.replace(
  /style={{[\s\S]*?width: 38, height: 38, borderRadius: '50%', flexShrink: 0,[\s\S]*?background: `linear-gradient\(135deg, \$\{meta\.color\}33, \$\{meta\.color\}66\)`,[\s\S]*?color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',[\s\S]*?fontSize: 15, fontWeight: 700, border: `2px solid \$\{meta\.color\}44`,[\s\S]*?}}/g,
  'className="w-[38px] h-[38px] rounded-full shrink-0 flex items-center justify-center text-white text-[15px] font-bold border-2" style={{ background: `linear-gradient(135deg, ${meta.color}33, ${meta.color}66)`, borderColor: `${meta.color}44` }}'
);

// UserCard
code = code.replace(
  /style={{\s*border: '1px solid var\(--color-border\)',\s*borderRadius: 12,\s*overflow: 'hidden',\s*transition: 'border-color 0\.2s',?\s*}}/g,
  'className="border border-[var(--color-border)] rounded-xl overflow-hidden transition-colors duration-200"'
);
code = code.replace(
  /style={{\s*display: 'flex', alignItems: 'center', gap: 14,\s*padding: '14px 18px', cursor: 'pointer',\s*background: expanded \? 'rgba\(20,184,166,0\.04\)' : 'var\(--color-surface\)',\s*transition: 'background 0\.2s',?\s*}}/g,
  'className="flex items-center gap-[14px] px-[18px] py-[14px] cursor-pointer transition-colors duration-200" style={{ background: expanded ? "rgba(20,184,166,0.04)" : "var(--color-surface)" }}'
);
code = code.replace(/style={{ flex: 1, overflow: 'hidden' }}/g, 'className="flex-1 overflow-hidden"');
code = code.replace(/style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}/g, 'className="flex items-center gap-2 flex-wrap"');
code = code.replace(/style={{ fontWeight: 700, color: 'var\(--color-text\)', fontSize: 14 }}/g, 'className="font-bold text-[var(--color-text)] text-[14px]"');
code = code.replace(/style={{\s*background: 'rgba\(20,184,166,0\.15\)', color: 'var\(--color-teal\)',\s*border: '1px solid rgba\(20,184,166,0\.3\)',\s*borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700,?\s*}}/g, 'className="bg-[rgba(20,184,166,0.15)] text-[var(--color-teal)] border border-[rgba(20,184,166,0.3)] rounded-[20px] px-2 py-[1px] text-[10px] font-bold"');
code = code.replace(/style={{ fontSize: 12, color: 'var\(--color-text-muted\)', marginTop: 2 }}/g, 'className="text-[12px] text-[var(--color-text-muted)] mt-[2px]"');
code = code.replace(/style={{ textAlign: 'right', flexShrink: 0, minWidth: 120 }}/g, 'className="text-right shrink-0 min-w-[120px]"');
code = code.replace(/style={{\s*display: 'inline-flex', alignItems: 'center', gap: 5,\s*background: meta\.bg, color: meta\.color,\s*border: `1px solid \$\{meta\.color\}33`,\s*borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,\s*marginBottom: 4,?\s*}}/g, 'className="inline-flex items-center gap-[5px] rounded-[20px] px-3 py-[3px] text-[11px] font-bold mb-1" style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}33`, borderWidth: 1 }}');
code = code.replace(/style={{ opacity: 0\.6, fontWeight: 400 }}/g, 'className="opacity-60 font-normal"');
code = code.replace(/style={{ width: '100%', height: 4, background: 'var\(--color-border\)', borderRadius: 4, overflow: 'hidden' }}/g, 'className="w-full h-1 bg-[var(--color-border)] rounded-md overflow-hidden"');
code = code.replace(/style={{\s*height: '100%', borderRadius: 4,\s*width: `\$\{pct\}%`,\s*background: barColor,\s*transition: 'width 0\.35s ease',?\s*}}/g, 'className="h-full rounded-md transition-all duration-300 ease-in-out" style={{ width: `${pct}%`, background: barColor }}');
code = code.replace(/style={{ fontSize: 10, color: 'var\(--color-text-muted\)', marginTop: 2 }}/g, 'className="text-[10px] text-[var(--color-text-muted)] mt-[2px]"');
code = code.replace(/style={{ color: 'var\(--color-text-muted\)', flexShrink: 0 }}/g, 'className="text-[var(--color-text-muted)] shrink-0"');
code = code.replace(/style={{ padding: '0 18px 18px' }}/g, 'className="px-[18px] pb-[18px]"');

// RoleSection
code = code.replace(/style={{ marginBottom: 36 }}/g, 'className="mb-9"');
code = code.replace(/style={{\s*display: 'flex', alignItems: 'center', justifyContent: 'space-between',\s*marginBottom: 14, padding: '10px 16px',\s*background: meta\.bg, borderRadius: 10,\s*border: `1px solid \$\{meta\.color\}33`,?\s*}}/g, 'className="flex items-center justify-between mb-[14px] px-4 py-[10px] rounded-[10px]" style={{ background: meta.bg, border: `1px solid ${meta.color}33` }}');
code = code.replace(/style={{ display: 'flex', alignItems: 'center', gap: 10 }}/g, 'className="flex items-center gap-[10px]"');
code = code.replace(/style={{ fontWeight: 700, fontSize: 14, color: meta\.color }}/g, 'className="font-bold text-[14px]" style={{ color: meta.color }}');
code = code.replace(/style={{\s*background: `\$\{meta\.color\}22`, color: meta\.color,\s*borderRadius: 20, padding: '1px 10px', fontSize: 11, fontWeight: 700,\s*border: `1px solid \$\{meta\.color\}33`,?\s*}}/g, 'className="rounded-[20px] px-[10px] py-[1px] text-[11px] font-bold border" style={{ background: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}33` }}');
code = code.replace(/style={{\s*background: 'none', border: `1px solid \$\{meta\.color\}44`, cursor: 'pointer',\s*color: meta\.color, fontSize: 11, fontWeight: 600,\s*padding: '4px 12px', borderRadius: 8,\s*display: 'flex', alignItems: 'center', gap: 5,\s*transition: 'all 0\.15s', opacity: bulkLoading \? 0\.5 : 1,?\s*}}/g, 'className="bg-transparent cursor-pointer text-[11px] font-semibold px-3 py-1 rounded-lg flex items-center gap-[5px] transition-all duration-150" style={{ color: meta.color, border: `1px solid ${meta.color}44`, opacity: bulkLoading ? 0.5 : 1 }}');
code = code.replace(/style={{ display: 'flex', flexDirection: 'column', gap: 10 }}/g, 'className="flex flex-col gap-[10px]"');

// Main Page Header
code = code.replace(/style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}/g, 'className="px-8 py-7 max-w-[1100px] mx-auto"');
code = code.replace(/style={{ marginBottom: 28 }}/g, 'className="mb-7"');
code = code.replace(/style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}/g, 'className="flex items-center gap-3 mb-1"');
code = code.replace(/style={{\s*width: 40, height: 40, borderRadius: 10,\s*background: 'linear-gradient\(135deg, var\(--color-teal-dark\), var\(--color-teal\)\)',\s*display: 'flex', alignItems: 'center', justifyContent: 'center',\s*}}/g, 'className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[var(--color-teal-dark)] to-[var(--color-teal)] flex items-center justify-center"');
code = code.replace(/style={{ fontSize: 22, fontWeight: 800, color: 'var\(--color-text\)', margin: 0 }}/g, 'className="text-[22px] font-extrabold text-[var(--color-text)] m-0"');
code = code.replace(/style={{ fontSize: 12, color: 'var\(--color-text-muted\)', margin: 0 }}/g, 'className="text-[12px] text-[var(--color-text-muted)] m-0"');

// Stats Strip
code = code.replace(/style={{\s*display: 'grid', gridTemplateColumns: 'repeat\(4, 1fr\)',\s*gap: 16, marginBottom: 32,\s*}}/g, 'className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"');
code = code.replace(/style={{\s*background: 'var\(--color-surface\)', border: '1px solid var\(--color-border\)',\s*borderRadius: 16, padding: '20px 24px', boxShadow: '0 4px 20px rgba\(0, 0, 0, 0\.15\)',\s*display: 'flex', flexDirection: 'column', gap: 6,\s*}}/g, 'className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-6 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col gap-1.5"');
code = code.replace(/style={{ fontSize: 32, fontWeight: 900, color: stat\.color, lineHeight: 1, letterSpacing: '-0\.02em' }}/g, 'className="text-[32px] font-black leading-none tracking-tight" style={{ color: stat.color }}');
code = code.replace(/style={{ fontSize: 13, color: 'var\(--color-text\)', fontWeight: 700 }}/g, 'className="text-[13px] text-[var(--color-text)] font-bold"');
code = code.replace(/style={{ fontSize: 11, color: 'var\(--color-text-muted\)', marginTop: 2 }}/g, 'className="text-[11px] text-[var(--color-text-muted)] mt-[2px]"');

// Sticky Filters Panel
code = code.replace(/style={{\s*position: 'sticky', top: '16px', zIndex: 100,\s*background: 'rgba\(23, 28, 41, 0\.95\)', border: '1px solid var\(--color-border\)',\s*backdropFilter: 'blur\(12px\)',\s*borderRadius: 16, padding: 20, marginBottom: 32, boxShadow: '0 12px 40px rgba\(0, 0, 0, 0\.4\)',\s*display: 'flex', flexDirection: 'column', gap: 16,\s*}}/g, 'className="sticky top-4 z-[100] bg-[#171c29f2] border border-[var(--color-border)] backdrop-blur-md rounded-2xl p-5 mb-8 shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex flex-col gap-4"');
code = code.replace(/style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}/g, 'className="flex gap-3 flex-wrap items-center"');
code = code.replace(/style={{ position: 'relative', flex: 1, minWidth: 260 }}/g, 'className="relative flex-1 min-w-[260px]"');
code = code.replace(/style={{\s*position: 'absolute', left: 14, top: '50%', transform: 'translateY\(-50%\)',\s*color: 'var\(--color-text-muted\)',\s*}}/g, 'className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"');
code = code.replace(/style={{\s*width: '100%', background: 'rgba\(255,255,255,0\.03\)',\s*border: '1px solid var\(--color-border\)', borderRadius: 12,\s*padding: '11px 14px 11px 40px', fontSize: 13\.5,\s*color: 'var\(--color-text\)', outline: 'none',\s*boxSizing: 'border-box', transition: 'all 0\.2s',\s*}}/g, 'className="w-full bg-white/5 border border-[var(--color-border)] rounded-xl py-[11px] pr-[14px] pl-[40px] text-[13.5px] text-[var(--color-text)] outline-none box-border transition-all duration-200 focus:border-[var(--color-teal)]"');

code = code.replace(/onFocus=\{e => e\.currentTarget\.style\.borderColor = 'var\(--color-teal\)'\}/g, '');
code = code.replace(/onBlur=\{e => e\.currentTarget\.style\.borderColor = 'var\(--color-border\)'\}/g, '');

code = code.replace(/style={{ fontSize: 12\.5, height: 42, padding: '0 18px', borderRadius: 12, border: '1px solid var\(--color-border\)' }}/g, 'className="text-[12.5px] h-[42px] px-[18px] rounded-xl border border-[var(--color-border)] flex items-center justify-center cursor-pointer transition-colors duration-200 hover:border-[var(--color-teal)] hover:text-[var(--color-teal)]"');
code = code.replace(/style={{ marginRight: 6 }}/g, 'className="mr-1.5"');

// Tabs Switcher
code = code.replace(/style={{\s*display: 'flex', gap: 6, background: 'rgba\(255,255,255,0\.03\)',\s*border: '1px solid var\(--color-border\)', borderRadius: 12, padding: 4,\s*overflowX: 'auto', whiteSpace: 'nowrap',\s*}}/g, 'className="flex gap-1.5 bg-white/5 border border-[var(--color-border)] rounded-xl p-1 overflow-x-auto whitespace-nowrap scrollbar-hide"');
code = code.replace(/style={{\s*background: isTabActive \? 'rgba\(20,184,166,0\.12\)' : 'transparent',\s*border: 'none',\s*borderRadius: 8,\s*padding: '8px 16px',\s*fontSize: 13,\s*fontWeight: isTabActive \? 700 : 500,\s*color: isTabActive \? 'var\(--color-teal\)' : 'var\(--color-text-muted\)',\s*cursor: 'pointer',\s*display: 'inline-flex',\s*alignItems: 'center',\s*gap: 8,\s*transition: 'all 0\.2s',\s*outline: 'none',\s*}}/g, 'className={`border-none rounded-lg py-2 px-4 text-[13px] cursor-pointer inline-flex items-center gap-2 transition-all duration-200 outline-none ${isTabActive ? "bg-[rgba(20,184,166,0.12)] font-bold text-[var(--color-teal)]" : "bg-transparent font-medium text-[var(--color-text-muted)]"}`}');
code = code.replace(/style={{\s*fontSize: 10,\s*background: isTabActive \? 'rgba\(20,184,166,0\.2\)' : 'rgba\(255,255,255,0\.08\)',\s*color: isTabActive \? 'var\(--color-teal\)' : 'var\(--color-text-muted\)',\s*borderRadius: 20,\s*padding: '1px 8px',\s*fontWeight: 700,\s*}}/g, 'className={`text-[10px] rounded-[20px] px-2 py-[1px] font-bold ${isTabActive ? "bg-[rgba(20,184,166,0.2)] text-[var(--color-teal)]" : "bg-white/10 text-[var(--color-text-muted)]"}`}');

// Loading and Empty State
code = code.replace(/style={{\s*textAlign: 'center', padding: '80px 0',\s*background: 'var\(--color-surface\)', borderRadius: 16,\s*border: '1px solid var\(--color-border\)',\s*}}/g, 'className="text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]"');
code = code.replace(/style={{ margin: '0 auto 16px' }}/g, 'className="mx-auto mb-4"');
code = code.replace(/style={{ color: 'var\(--color-text-muted\)', fontSize: 14 }}/g, 'className="text-[var(--color-text-muted)] text-[14px]"');

code = code.replace(/style={{\s*textAlign: 'center', padding: '80px 0',\s*background: 'var\(--color-surface\)', borderRadius: 16,\s*border: '1px solid var\(--color-border\)', boxShadow: '0 4px 24px rgba\(0, 0, 0, 0\.1\)',\s*}}/g, 'className="text-center py-20 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-[0_4px_24px_rgba(0,0,0,0.1)]"');
code = code.replace(/style={{ margin: '0 0 6px', color: 'var\(--color-text\)' }}/g, 'className="m-0 mb-1.5 text-[var(--color-text)]"');
code = code.replace(/style={{ color: 'var\(--color-text-muted\)', fontSize: 13\.5, margin: 0 }}/g, 'className="text-[var(--color-text-muted)] text-[13.5px] m-0"');

fs.writeFileSync('E:/Tealvue-task/client/src/pages/RolesFeatures.jsx', code);
console.log('RolesFeatures.jsx rewritten with Tailwind CSS!');
