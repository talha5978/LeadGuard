import {
	LayoutDashboard,
	Users,
	Briefcase,
	AlertTriangle,
	UserCheck,
	Settings,
	Bell,
	Activity,
	UserPlus,
} from "lucide-react";
import type { NavItem } from "~/types/nav";

export const mainNavItems: NavItem[] = [
	{
		title: "Overview",
		items: [
			{
				title: "Dashboard",
				url: "/d",
				icon: <LayoutDashboard />,
				roles: ["owner", "admin", "user"],
			},
		],
	},
	{
		title: "Pipeline",
		items: [
			{
				title: "Opportunities",
				url: "/d/opportunities",
				icon: <Briefcase />,
				roles: ["owner", "admin", "user"],
			},
			{
				title: "Contacts",
				url: "/d/contacts",
				icon: <Users />,
				roles: ["owner", "admin", "user"],
			},
			{
				title: "Recovery Queue",
				url: "/d/recovery",
				icon: <AlertTriangle />,
				roles: ["owner", "admin"], // only managers see the recovery queue
			},
		],
	},
	{
		title: "Team",
		items: [
			{
				title: "Team Members",
				url: "/d/team",
				icon: <UserCheck />,
				roles: ["owner", "admin"],
			},
			{
				title: "Invite Member",
				url: "/d/team/invite",
				icon: <UserPlus />,
				roles: ["owner", "admin"],
			},
		],
	},
	{
		title: "Activity",
		items: [
			{
				title: "Activity Log",
				url: "/d/activity",
				icon: <Activity />,
				roles: ["owner", "admin"],
			},
			{
				title: "Notifications",
				url: "/d/notifications",
				icon: <Bell />,
				roles: ["owner", "admin", "user"],
			},
		],
	},
	{
		title: "Settings",
		items: [
			{
				title: "Workspace Settings",
				url: "/d/settings",
				icon: <Settings />,
				roles: ["owner"],
			},
		],
	},
];
