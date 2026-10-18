import { useState } from "react";
import { useRouteLoaderData } from "react-router";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { UserProfileDialog } from "~/components/UserProfileDialog";
import type { loader } from "~/root";

export function SiteHeader() {
	const { user } = useRouteLoaderData<typeof loader>("root");

	const [open, onOpenChange] = useState(false);

	const initials = (user.full_name || user.email)
		.split(" ")
		.map((n: any) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	return (
		<header className="flex h-[3rem] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-spacing)">
			<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1 cursor-pointer" />
				<div className="ml-auto flex items-center gap-2">
					<Button variant="ghost" className="gap-2 px-2" onClick={() => onOpenChange(true)}>
						<Avatar className="size-8">
							<AvatarFallback className="text-xs">{initials}</AvatarFallback>
						</Avatar>
						<span className="hidden sm:inline text-sm">{user.full_name || user.email}</span>
					</Button>
					<UserProfileDialog open={open} onOpenChange={() => onOpenChange(!open)} user={user} />
				</div>
			</div>
		</header>
	);
}
