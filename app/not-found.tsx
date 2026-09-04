import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#fafafa] text-zinc-900">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">404</h1>
        <p className="text-sm text-zinc-500">The requested reflection or page was not found.</p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
        >
          Return to Reflections
        </Link>
      </div>
    </div>
  );
}
