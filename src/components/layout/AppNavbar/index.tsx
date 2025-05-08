import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';

import { NAVBAR_ITEMS } from './config';

export function AppNavbar() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        {NAVBAR_ITEMS.map((item) => (
          <NavigationMenuItem id={item.name}>
            <NavigationMenuLink href={item.link}>{item.name}</NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
