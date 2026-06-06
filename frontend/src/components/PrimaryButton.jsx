import './PrimaryButton.css';

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  className = '',
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}
