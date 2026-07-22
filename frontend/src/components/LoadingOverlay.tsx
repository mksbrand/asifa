export default function LoadingOverlay({ message = "Loading your trip..." }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-200 opacity-60" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow">
          🚚
        </span>
      </div>
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}
