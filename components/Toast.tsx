import React from 'react';
import { ToastMessage } from '../types';
import { CheckIcon, InfoIcon, XIcon } from './Icons';

interface Props {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}

export const ToastContainer: React.FC<Props> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-20 right-0 left-0 z-[70] pointer-events-none flex flex-col items-center space-y-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-dark-800 border border-dark-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center min-w-[300px] animate-fade-in backdrop-blur-md"
          role="alert"
        >
          <div className={`mr-3 p-1 rounded-full ${toast.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
            {toast.type === 'success' ? <CheckIcon className="w-4 h-4" /> : <InfoIcon className="w-4 h-4" />}
          </div>
          <span className="flex-1 font-medium text-sm">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-2 text-gray-500 hover:text-white">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};