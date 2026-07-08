import React, { createContext, useContext, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext();

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    resolve: null
  });

  const confirm = (message, title = 'Are you sure?') => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title,
        message,
        resolve
      });
    });
  };

  const handleConfirm = () => {
    state.resolve(true);
    setState({ isOpen: false, title: '', message: '', resolve: null });
  };

  const handleCancel = () => {
    state.resolve(false);
    setState({ isOpen: false, title: '', message: '', resolve: null });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.isOpen && (
        <div className="modal-backdrop z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm fixed inset-0">
          <div className="modal-content max-w-[450px] w-full p-8 md:px-14 md:py-11 rounded-2xl border border-white/10 bg-[var(--color-bg)] shadow-2xl flex flex-col gap-6 text-center scale-up">
            <div className="mx-auto w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shrink-0">
              <AlertTriangle size={26} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-white m-0 mb-2.5">{state.title}</h3>
              <p className="text-[13.5px] text-[var(--color-text-muted)] m-0 leading-relaxed px-2">{state.message}</p>
            </div>
            <div className="flex gap-4 justify-center mt-3">
              <button 
                type="button"
                onClick={handleCancel} 
                className="btn btn-ghost px-7 py-2.5 text-[12.5px] font-semibold text-white/60 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleConfirm} 
                className="btn btn-primary px-8 py-2.5 text-[12.5px] font-semibold cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);
export default ConfirmContext;
