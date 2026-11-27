const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex cursor-pointer items-center justify-center rounded-xl font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-emerald-800 text-white shadow-sm hover:bg-emerald-900 focus:ring-emerald-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
    outline: 'border border-emerald-700 text-emerald-800 hover:bg-emerald-50 focus:ring-emerald-700',
    danger: 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-700',
    success: 'bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-700',
    warning: 'bg-emerald-800 text-white hover:bg-emerald-900 focus:ring-emerald-700',
    ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;