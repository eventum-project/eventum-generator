import { ThemeProvider } from '@/components/common/ThemeToggle/ThemeProvider';
import { AppNavbar } from '@/components/layout/Navbar';

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider>
      <main>
        <AppNavbar />
        {children}
      </main>
    </ThemeProvider>
  );
}
