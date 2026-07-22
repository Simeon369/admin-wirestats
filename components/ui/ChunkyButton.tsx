import React from 'react';

interface ChunkyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function ChunkyButton({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  ...props
}: ChunkyButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-bold font-fredoka uppercase tracking-wider transition-transform active:translate-y-1 active:translate-x-1 border-2';
  
  const variants = {
    primary: 'bg-[#65d421] text-[#fff] hover:bg-[#7ced38] border-[#1b630a] shadow-[1px_1px_0_#1b630a,2px_2px_0_#1b630a,3px_3px_0_#1b630a,4px_4px_0_#1b630a,5px_5px_0_#1b630a,6px_6px_0_#1b630a] active:shadow-none',
    secondary: 'bg-white text-slate-900 hover:bg-slate-50 border-slate-900 shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a,3px_3px_0_#0f172a,4px_4px_0_#0f172a,5px_5px_0_#0f172a,6px_6px_0_#0f172a] active:shadow-none',
    danger: 'bg-red-400 text-slate-900 hover:bg-red-300 border-slate-900 shadow-[1px_1px_0_#0f172a,2px_2px_0_#0f172a,3px_3px_0_#0f172a,4px_4px_0_#0f172a,5px_5px_0_#0f172a,6px_6px_0_#0f172a] active:shadow-none',
  };

  const sizes = {
    sm: 'text-sm px-4 py-2',
    md: 'text-lg px-6 py-3',
    lg: 'text-2xl px-8 py-4',
  };

  const width = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
