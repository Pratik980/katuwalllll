import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  label,
  value,
  onChange,
  name = 'password',
  id,
  placeholder,
  required = false,
  minLength,
  maxLength,
  autoComplete = 'current-password',
  className = '',
  labelClassName = 'block text-sm font-medium text-slate-700',
  icon: Icon,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={labelClassName}>
          {label}
        </label>
      )}
      <div className="relative mt-1">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icon className="h-5 w-5 text-slate-400" />
          </div>
        )}
        <input
          id={inputId}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs ${
            Icon ? 'pl-10' : ''
          } pr-11 ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md hover:bg-slate-100 transition"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
