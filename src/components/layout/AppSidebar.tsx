import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
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

const groups: SidebarGroupData[] = [
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

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.name}>
            <SidebarGroupLabel>{group.name}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
}
