import { ThemeProvider } from '@/components/common/ThemeProvider';
import { AppNavbar } from '@/components/layout/AppNavbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <main>
        <AppNavbar />
        {children}
      </main>
    </ThemeProvider>
  );
}
