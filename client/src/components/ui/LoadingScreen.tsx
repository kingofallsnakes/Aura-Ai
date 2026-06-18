export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-surface-900 flex flex-col items-center justify-center z-[100]">
      <div className="flex flex-col items-center gap-6 relative z-10">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="absolute -inset-2 rounded-3xl gradient-primary opacity-20 blur-xl animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold gradient-text">AURA AI</h2>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
