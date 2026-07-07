import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function ExportButton({ endpoint, filename = 'export', filters = {}, label = 'Export' }) {
  const { token } = useAuth();
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const dropRef = useRef(null);
  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const headers = { Authorization: `Bearer ${token}` };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const downloadCSV = async () => {
    setLoading(true);
    setOpen(false);
    try {
      const params = { ...filters, format: 'csv' };
      const res = await axios.get(`${BASE}${endpoint}`, { headers, params, responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
    setLoading(false);
  };

  const downloadPDF = () => {
    setOpen(false);
    window.print();
  };

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/70 hover:border-teal-500/50 hover:text-teal-300 transition-all text-sm font-medium bg-transparent disabled:opacity-50"
      >
        {loading ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        ) : (
          <i className="ti-download text-sm"></i>
        )}
        {loading ? 'Exporting...' : label}
        {!loading && <i className="ti-angle-down text-xs"></i>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
          <button
            onClick={downloadCSV}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-all text-left"
          >
            <i className="ti-file text-teal-400"></i> Export as CSV
          </button>
          <button
            onClick={downloadPDF}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-all text-left border-t border-white/5"
          >
            <i className="ti-printer text-orange-400"></i> Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}
