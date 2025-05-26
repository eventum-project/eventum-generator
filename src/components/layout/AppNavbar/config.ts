import { ROUTE_PATHS } from '@/routes/routePaths';

type NavbarItem = {
  name: string;
  link: string;
};

export const NAVBAR_ITEMS: NavbarItem[] = [
  {
    name: 'Overview',
    link: ROUTE_PATHS.OVERVIEW,
  },
  {
    name: 'Generators',
    link: ROUTE_PATHS.GENERATORS,
  },
  {
    name: 'Settings',
    link: ROUTE_PATHS.SETTINGS,
  },
];
