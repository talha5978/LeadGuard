import { type ComponentProps } from "react";
import { NavMain } from "~/components/Nav/nav-main";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
} from "~/components/ui/sidebar";
import { Link } from "react-router";
import { LogoutButton } from "~/components/logout";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader className="mb-2">
				<SidebarMenu>
					<SidebarMenuItem className="px-1">
						<Link
							to="/"
							className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-foreground hover:opacity-90 transition-opacity"
						>
							<span className="font-extrabold text-foreground">
								Lead<span className="text-primary">Guard</span>
							</span>
						</Link>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain />
			</SidebarContent>
			<SidebarFooter className="mt-6">
				<LogoutButton />
			</SidebarFooter>
		</Sidebar>
	);
}
