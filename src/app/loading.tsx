export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#09090b]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    </div>
  );
}
