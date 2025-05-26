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
        <div className="flex items-center gap-16">
          <a href={ROUTE_PATHS.OVERVIEW} className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Logo"
              className="h-7 w-7 transition drop-shadow-[0_0_3px_rgba(106,144,252,0.9)]"
            />
            <span className="text-base font-normal tracking-wide">Eventum Studio</span>
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
                        'text-sm font-medium px-4 py-1.5 transition-colors duration-300',
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
