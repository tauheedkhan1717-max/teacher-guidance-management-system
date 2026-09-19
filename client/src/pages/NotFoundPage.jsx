// 404 page for unmatched routes.
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 animate-fade-in-up">
      <p className="text-7xl font-bold text-indigo-600">404</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-800">Page not found</h1>
      <p className="mt-1 text-slate-500">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6 rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700">
        Back to home
      </Link>
    </div>
  );
}