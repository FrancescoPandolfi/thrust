import { PencilIcon, TrashIcon } from "./ActionIcons";

type IconButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export function EditIconButton({ label, onClick, disabled = false }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="group cursor-pointer rounded-lg border border-zinc-700/80 bg-zinc-800/40 p-2 text-zinc-400 transition-[color,background-color,border-color,box-shadow,transform] hover:border-accent/40 hover:bg-zinc-800 hover:text-accent hover:shadow-[0_0_16px_-6px_rgb(223_255_0/0.45)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <PencilIcon className="h-4 w-4 transition-transform group-hover:-translate-y-px group-hover:scale-110" />
    </button>
  );
}

export function DeleteIconButton({ label, onClick, disabled = false }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="group cursor-pointer rounded-lg border border-zinc-700/80 bg-zinc-800/40 p-2 text-zinc-400 transition-[color,background-color,border-color,box-shadow,transform] hover:border-rose-500/40 hover:bg-zinc-800 hover:text-rose-400 hover:shadow-[0_0_16px_-6px_rgb(251_113_133/0.45)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <TrashIcon className="h-4 w-4 transition-transform group-hover:scale-110" />
    </button>
  );
}
