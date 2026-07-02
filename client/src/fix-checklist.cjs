const fs = require('fs');
let code = fs.readFileSync('E:/Tealvue-task/client/src/components/FeatureChecklist.jsx', 'utf8');

// Root container
code = code.replace(
  /style={{\s*background: 'rgba\(10,15,25,0\.6\)',\s*border: '1px solid var\(--color-border\)',\s*borderRadius: 14,\s*padding: '20px 22px',\s*marginTop: 10,\s*}}/g,
  'className="bg-[rgba(10,15,25,0.6)] border border-[var(--color-border)] rounded-[14px] px-[22px] py-5 mt-2.5"'
);

// Header Bar
code = code.replace(
  /style={{\s*display: 'flex', alignItems: 'center', justifyContent: 'space-between',\s*marginBottom: 16, flexWrap: 'wrap', gap: 10,\s*}}/g,
  'className="flex items-center justify-between mb-4 flex-wrap gap-2.5"'
);
code = code.replace(/style={{ display: 'flex', alignItems: 'center', gap: 12 }}/g, 'className="flex items-center gap-3"');
code = code.replace(
  /style={{\s*background: 'rgba\(20,184,166,0\.12\)', border: '1px solid rgba\(20,184,166,0\.25\)',\s*borderRadius: 20, padding: '4px 14px',\s*display: 'flex', alignItems: 'center', gap: 6,\s*}}/g,
  'className="bg-[rgba(20,184,166,0.12)] border border-[rgba(20,184,166,0.25)] rounded-[20px] px-[14px] py-1 flex items-center gap-1.5"'
);
code = code.replace(/style={{ fontSize: 18, fontWeight: 800, color: 'var\(--color-teal\)', lineHeight: 1 }}/g, 'className="text-[18px] font-extrabold text-[var(--color-teal)] leading-none"');
code = code.replace(/style={{ fontSize: 11, color: 'var\(--color-text-muted\)', fontWeight: 500 }}/g, 'className="text-[11px] text-[var(--color-text-muted)] font-medium"');

code = code.replace(
  /style={{\s*width: 100, height: 6, background: 'var\(--color-border\)', borderRadius: 10, overflow: 'hidden',\s*}}/g,
  'className="w-[100px] h-1.5 bg-[var(--color-border)] rounded-[10px] overflow-hidden"'
);
code = code.replace(
  /style={{\s*height: '100%', borderRadius: 10,\s*width: `\$\{\(enabledCount \/ TOTAL_FEATURES\) \* 100\}%`,\s*background: 'linear-gradient\(90deg, var\(--color-teal-dark\), var\(--color-teal\)\)',\s*transition: 'width 0\.3s ease',\s*}}/g,
  'className="h-full rounded-[10px] bg-gradient-to-r from-[var(--color-teal-dark)] to-[var(--color-teal)] transition-all duration-300 ease-in-out" style={{ width: `${(enabledCount / TOTAL_FEATURES) * 100}%` }}'
);
code = code.replace(/style={{ display: 'flex', gap: 6 }}/g, 'className="flex gap-1.5"');

code = code.replace(
  /style={{\s*background: 'rgba\(20,184,166,0\.1\)', border: '1px solid rgba\(20,184,166,0\.25\)',\s*borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 600,\s*color: 'var\(--color-teal\)', cursor: 'pointer',\s*display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0\.15s',\s*}}/g,
  'className="bg-[rgba(20,184,166,0.1)] border border-[rgba(20,184,166,0.25)] rounded-lg px-3 py-1 text-[11px] font-semibold text-[var(--color-teal)] cursor-pointer flex items-center gap-1 transition-all duration-150 hover:bg-[rgba(20,184,166,0.15)]"'
);
code = code.replace(
  /style={{\s*background: 'rgba\(239,68,68,0\.08\)', border: '1px solid rgba\(239,68,68,0\.2\)',\s*borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 600,\s*color: '#ef4444', cursor: 'pointer',\s*display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0\.15s',\s*}}/g,
  'className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-1 text-[11px] font-semibold text-[#ef4444] cursor-pointer flex items-center gap-1 transition-all duration-150 hover:bg-[rgba(239,68,68,0.12)]"'
);

// Pending Badges
code = code.replace(
  /style={{\s*display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14,\s*padding: '10px 12px', background: 'rgba\(255,255,255,0\.03\)',\s*borderRadius: 8, border: '1px dashed var\(--color-border\)',\s*}}/g,
  'className="flex flex-wrap gap-1.5 mb-3.5 px-3 py-2.5 bg-white/5 rounded-lg border border-dashed border-[var(--color-border)]"'
);
code = code.replace(/style={{ fontSize: 11, color: 'var\(--color-text-muted\)', fontWeight: 600, marginRight: 4, alignSelf: 'center' }}/g, 'className="text-[11px] text-[var(--color-text-muted)] font-semibold mr-1 self-center"');
code = code.replace(
  /style={{\s*background: 'rgba\(16,185,129,0\.15\)', color: '#10b981',\s*border: '1px solid rgba\(16,185,129,0\.3\)',\s*borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,\s*display: 'flex', alignItems: 'center', gap: 4,\s*}}/g,
  'className="bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.3)] rounded-[20px] px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1"'
);
code = code.replace(
  /style={{\s*background: 'rgba\(239,68,68,0\.15\)', color: '#ef4444',\s*border: '1px solid rgba\(239,68,68,0\.3\)',\s*borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,\s*display: 'flex', alignItems: 'center', gap: 4,\s*}}/g,
  'className="bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.3)] rounded-[20px] px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1"'
);

// Feature Groups
code = code.replace(/style={{ marginBottom: 18 }}/g, 'className="mb-4.5"');
code = code.replace(
  /style={{\s*display: 'flex', alignItems: 'center', justifyContent: 'space-between',\s*marginBottom: 8, paddingBottom: 6,\s*borderBottom: '1px solid var\(--color-border\)',\s*}}/g,
  'className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--color-border)]"'
);
code = code.replace(
  /style={{\s*fontSize: 10, fontWeight: 700, letterSpacing: '0\.08em',\s*color: 'var\(--color-text-muted\)', textTransform: 'uppercase',\s*}}/g,
  'className="text-[10px] font-bold tracking-[0.08em] text-[var(--color-text-muted)] uppercase"'
);
code = code.replace(
  /style={{\s*fontSize: 10, color: enabledInCat > 0 \? 'var\(--color-teal\)' : 'var\(--color-text-muted\)',\s*fontWeight: 600,\s*}}/g,
  'className={`text-[10px] font-semibold ${enabledInCat > 0 ? "text-[var(--color-teal)]" : "text-[var(--color-text-muted)]"}`}'
);
code = code.replace(/style={{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fill, minmax\(210px, 1fr\)\)', gap: '5px 12px' }}/g, 'className="grid gap-x-3 gap-y-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}');

// Label
code = code.replace(
  /style={{\s*display: 'flex', alignItems: 'center', gap: 8,\s*padding: '7px 10px', borderRadius: 8,\s*cursor: isProtected \? 'not-allowed' : 'pointer',\s*background: enabled\s*\?\s*'rgba\(20,184,166,0\.09\)'\s*:\s*'rgba\(255,255,255,0\.02\)',\s*border: `1px solid \$\{enabled \? 'rgba\(20,184,166,0\.22\)' : 'rgba\(255,255,255,0\.06\)'\}`,?\s*transition: 'all 0\.15s',?\s*opacity: isProtected \? 0\.6 : 1,?\s*}}/g,
  'className={`flex items-center gap-2 px-2.5 py-[7px] rounded-lg transition-all duration-150 ${isProtected ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${enabled ? "bg-[rgba(20,184,166,0.09)] border border-[rgba(20,184,166,0.22)]" : "bg-white/2 border border-white/5 hover:bg-white/5"}`}'
);

// Checkbox Visual
code = code.replace(
  /style={{\s*width: 16, height: 16, borderRadius: 4, flexShrink: 0,\s*border: `2px solid \$\{enabled \? 'var\(--color-teal\)' : 'rgba\(255,255,255,0\.2\)'\}`,\s*background: enabled \? 'var\(--color-teal\)' : 'transparent',\s*display: 'flex', alignItems: 'center', justifyContent: 'center',\s*transition: 'all 0\.15s',\s*}}/g,
  'className={`w-4 h-4 rounded shrink-0 flex items-center justify-center transition-all duration-150 border-2 ${enabled ? "border-[var(--color-teal)] bg-[var(--color-teal)]" : "border-white/20 bg-transparent"}`}'
);
code = code.replace(/style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}/g, 'className="absolute opacity-0 w-0 h-0"');
code = code.replace(
  /style={{\s*fontSize: 12\.5, fontWeight: enabled \? 600 : 400,\s*color: enabled \? 'var\(--color-text\)' : 'var\(--color-text-muted\)',\s*flex: 1,\s*}}/g,
  'className={`text-[12.5px] flex-1 ${enabled ? "font-semibold text-[var(--color-text)]" : "font-normal text-[var(--color-text-muted)]"}`}'
);
code = code.replace(/style={{ display: 'flex', alignItems: 'center' }}/g, 'className="flex items-center"');
code = code.replace(
  /style={{\s*width: 7, height: 7, borderRadius: '50%', flexShrink: 0,\s*background: enabled \? '#10b981' : 'rgba\(255,255,255,0\.12\)',\s*boxShadow: enabled \? '0 0 6px #10b98166' : 'none',\s*transition: 'all 0\.2s',\s*}}/g,
  'className={`w-[7px] h-[7px] rounded-full shrink-0 transition-all duration-200 ${enabled ? "bg-[#10b981] shadow-[0_0_6px_#10b98166]" : "bg-white/10"}`}'
);

// Action Bar
code = code.replace(
  /style={{\s*display: 'flex', alignItems: 'center', justifyContent: 'space-between',\s*marginTop: 6, paddingTop: 14, borderTop: '1px solid var\(--color-border\)',\s*flexWrap: 'wrap', gap: 8,\s*}}/g,
  'className="flex items-center justify-between mt-1.5 pt-3.5 border-t border-[var(--color-border)] flex-wrap gap-2"'
);
code = code.replace(
  /style={{\s*background: 'none', border: '1px solid var\(--color-border\)',\s*cursor: 'pointer', color: 'var\(--color-text-muted\)', fontSize: 12,\s*display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',\s*borderRadius: 8, transition: 'all 0\.15s',\s*}}/g,
  'className="bg-transparent border border-[var(--color-border)] cursor-pointer text-[var(--color-text-muted)] text-[12px] flex items-center gap-[5px] px-3 py-[5px] rounded-lg transition-all duration-150 hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)]"'
);
code = code.replace(/onMouseEnter=\{e => \{ e\.currentTarget\.style\.color = 'var\(--color-text\)'; e\.currentTarget\.style\.borderColor = 'var\(--color-text-muted\)'; \}\}/g, '');
code = code.replace(/onMouseLeave=\{e => \{ e\.currentTarget\.style\.color = 'var\(--color-text-muted\)'; e\.currentTarget\.style\.borderColor = 'var\(--color-border\)'; \}\}/g, '');
code = code.replace(/style={{ display: 'flex', gap: 8 }}/g, 'className="flex gap-2"');
code = code.replace(/style={{ fontSize: 12, padding: '6px 14px', height: 34 }}/g, 'className="text-[12px] px-3.5 h-[34px]"');
code = code.replace(
  /style={{\s*fontSize: 12, padding: '6px 18px', height: 34,\s*opacity: \(!isDirty \|\| saving\) \? 0\.45 : 1,\s*cursor: \(!isDirty \|\| saving\) \? 'not-allowed' : 'pointer',\s*}}/g,
  'className={`text-[12px] px-4.5 h-[34px] ${(!isDirty || saving) ? "opacity-45 cursor-not-allowed" : "cursor-pointer"}`}'
);

fs.writeFileSync('E:/Tealvue-task/client/src/components/FeatureChecklist.jsx', code);
console.log('FeatureChecklist.jsx rewritten with Tailwind CSS!');
