export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ height: '100dvh', overflow: 'auto' }} className="bg-[#0a0a0f]">
      {/* Fixed background */}
      <div className="fixed inset-0"
        style={{
          backgroundImage: 'url(/auth-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
      </div>

      {/* Animated glow orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #667eea 0%, transparent 70%)', animation: 'float 12s ease-in-out infinite' }}
      />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #764ba2 0%, transparent 70%)', animation: 'float 15s ease-in-out infinite 3s' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-full py-6 md:py-10 px-3 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white/10 dark:bg-black/30 backdrop-blur-xl rounded-2xl p-5 md:p-8 shadow-2xl border border-white/10 shadow-purple-500/5">
            {children}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
