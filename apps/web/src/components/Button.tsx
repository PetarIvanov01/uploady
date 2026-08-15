import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "destructive";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-ink bg-ink text-paper hover:border-[#30302e] hover:bg-[#30302e]",
  secondary:
    "border-border bg-transparent text-ink hover:border-border-strong hover:bg-surface-muted",
  destructive:
    "border-destructive bg-destructive text-white hover:border-[#742626] hover:bg-[#742626]",
};

export function Button({
  className = "",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm border px-4 py-2.5 text-[0.8125rem] leading-none transition-colors disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-faint disabled:opacity-70 sm:min-h-10 ${variantClasses[variant]} ${className}`.trim()}
      type={type}
      {...props}
    />
  );
}
