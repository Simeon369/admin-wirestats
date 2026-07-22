import React from 'react';

interface ChunkyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const ChunkyInput = React.forwardRef<HTMLInputElement, ChunkyInputProps>(
  ({ label, error, fullWidth = false, className = '', ...props }, ref) => {
    const width = fullWidth ? 'w-full' : '';
    
    return (
      <div className={`flex flex-col gap-1 ${width}`}>
        {label && (
          <label className="font-fredoka font-medium text-slate-900 tracking-wide text-lg">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            border-2 border-slate-900 
            shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a,3px_3px_0_#0f172a,4px_4px_0_#0f172a,5px_5px_0_#0f172a,6px_6px_0_#0f172a]
            px-4 py-3 
            font-nunito text-lg font-medium text-slate-900
            placeholder:text-slate-400
            focus:outline-none focus:ring-0
            transition-colors
            [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]
            ${error ? 'bg-red-50 border-red-500' : 'bg-white focus:bg-slate-50'}
            ${className}
          `}
          onWheel={(e) => (e.target as HTMLElement).blur()}
          {...props}
        />
        {error && error.length > 0 && (
          <span className="font-nunito text-red-600 text-sm font-bold mt-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

ChunkyInput.displayName = 'ChunkyInput';
