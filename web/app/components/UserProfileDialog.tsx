import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { Mail, Shield, Building2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type CurrentUserInfo = {
	id: string;
	email: string;
	full_name: string | null;
	role: "owner" | "admin" | "user";
	status: "available" | "busy" | "on_leave" | "offline";
	workspace_id: string;
	avatar_url?: string | null;
	created_at?: string;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: CurrentUserInfo;
};

const STATUS_OPTIONS = [
	{ value: "available", label: "Available", color: "bg-emerald-500" },
	{ value: "busy", label: "Busy", color: "bg-amber-500" },
	{ value: "on_leave", label: "On leave", color: "bg-blue-500" },
	{ value: "offline", label: "Offline", color: "bg-slate-400" },
] as const;

function getInitials(name: string | null, email: string) {
	if (name) {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}
	return email.slice(0, 2).toUpperCase();
}

export function UserProfileDialog({ open, onOpenChange, user }: Props) {
	const fetcher = useFetcher();
	const [status, setStatus] = useState(user.status);

	const isSaving = fetcher.state === "submitting";

	useEffect(() => {
		setStatus(user.status);
	}, [user.status, open]);

	useEffect(() => {
		if (fetcher.data?.success) {
			toast.success("Status updated");
		} else if (fetcher.data?.error) {
			toast.error(fetcher.data.error);
		}
	}, [fetcher.data]);

	const handleSaveStatus = () => {
		const fd = new FormData();
		fd.append("intent", "update_status");
		fd.append("status", status);
		fetcher.submit(fd, { method: "POST", action: "/d/profile" });
	};

	const currentStatusMeta = STATUS_OPTIONS.find((s) => s.value === status);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Your profile</DialogTitle>
					<DialogDescription>
						Account details and availability for lead assignment.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Identity */}
					<div className="flex items-center gap-4">
						<Avatar className="size-14">
							<AvatarFallback className="text-lg font-semibold">
								{getInitials(user.full_name, user.email)}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0">
							<p className="font-semibold text-lg truncate">
								{user.full_name || "No name set"}
							</p>
							<p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
								<Mail className="size-3.5 shrink-0" />
								{user.email}
							</p>
						</div>
					</div>

					<Separator />

					{/* Meta */}
					<div className="grid gap-3 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground flex items-center gap-2">
								<Shield className="size-4" />
								Role
							</span>
							<Badge variant="secondary" className="capitalize">
								{user.role}
							</Badge>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-muted-foreground flex items-center gap-2">
								<Building2 className="size-4" />
								Workspace
							</span>
							<span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
								{user.workspace_id.slice(0, 8)}…
							</span>
						</div>

						<div className="flex items-center justify-between">
							<span className="text-muted-foreground flex items-center gap-2">
								<Circle className="size-4" />
								Current status
							</span>
							<span className="flex items-center gap-2 capitalize">
								<span className={`size-2 rounded-full ${currentStatusMeta?.color}`} />
								{status.replace("_", " ")}
							</span>
						</div>
					</div>

					<Separator />

					{/* Status updater */}
					<div className="space-y-2">
						<p className="text-sm font-medium">Update availability</p>
						<p className="text-xs text-muted-foreground">
							Only <strong>Available</strong> users receive new leads via assignment and
							escalation.
						</p>
						<Select value={status} onValueChange={(v: any) => setStatus(v as any)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										<span className="flex items-center gap-2">
											<span className={`size-2 rounded-full ${opt.color}`} />
											{opt.label}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
					<Button onClick={handleSaveStatus} disabled={isSaving || status === user.status}>
						{isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
						Save status
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
