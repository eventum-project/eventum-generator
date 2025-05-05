import { ROUTE_PATHS } from '@/routes/routePaths';
import { KeyRound, List, LucideProps } from 'lucide-react';

type SidebarItemData = {
  title: string;
  url: string;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >;
};

type SidebarGroupData = {
  name: string;
  items: SidebarItemData[];
};

export const GROUPS: SidebarGroupData[] = [
  {
    name: 'Generators',
    items: [
      {
        title: 'Instances',
        url: ROUTE_PATHS.GENERATOR_INSTANCES,
        icon: List,
      },
    ],
  },
  {
    name: 'Security',
    items: [
      {
        title: 'Manage secrets',
        url: ROUTE_PATHS.SECRETS_MANAGEMENT,
        icon: KeyRound,
      },
    ],
  },
];
