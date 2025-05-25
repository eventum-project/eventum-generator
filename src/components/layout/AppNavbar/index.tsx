import { ThemeToggle } from '@/components/common/ThemeToggle';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { ROUTE_PATHS } from '@/routes/routePaths';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';

import { NAVBAR_ITEMS } from './config';

export function AppNavbar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <header className="w-full border-b bg-background">
      <div className="mx-8 h-15 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <a
            href={ROUTE_PATHS.OVERVIEW}
            className="flex items-center gap-2 text-lg font-normal tracking-wide"
          >
            <img src="/logo.svg" alt="Logo" className="h-9 w-9" />
            Eventum Studio
          </a>

          <NavigationMenu>
            <NavigationMenuList className="hidden md:flex gap-4">
              {NAVBAR_ITEMS.map((item) => {
                const isActive = currentPath === item.link;

                return (
                  <NavigationMenuItem key={item.name}>
                    <NavigationMenuLink
                      href={item.link}
                      className={clsx(
                        'text-sm font-medium px-3 py-1.5 transition-colors',
                        isActive ? 'bg-muted' : ''
                      )}
                    >
                      {item.name}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
