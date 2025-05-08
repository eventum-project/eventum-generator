import { AppNavbar } from '@/components/layout/AppNavbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <AppNavbar />
      {children}
    </main>
  );
}
