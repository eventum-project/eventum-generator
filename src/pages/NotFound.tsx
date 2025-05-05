// src/pages/404Page.tsx
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">
          Oops! The page you are looking for doesn't exist.
        </p>
        <Link to="/" className="inline-block">
          <Button className="px-6 py-3">Go Back Home</Button>
        </Link>
      </div>
    </div>
  );
}
