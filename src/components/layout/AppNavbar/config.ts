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
    name: 'Tags',
    link: ROUTE_PATHS.TAGS,
  },
  {
    name: 'Secrets',
    link: ROUTE_PATHS.SECRETS,
  },
  {
    name: 'Settings',
    link: ROUTE_PATHS.SETTINGS,
  },
];
