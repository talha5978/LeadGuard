import { type LoaderFunctionArgs, useLoaderData, Link, redirect } from "react-router";
import { DashboardService } from "@workspace/shared/services/dashboard.service.js";
import { AuthService } from "@workspace/shared/services/auth.service.js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import {
	Users,
	Briefcase,
	AlertTriangle,
	Zap,
	Clock,
	TrendingUp,
	Activity,
	ArrowRight,
	CheckCircle2,
} from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { user } = await auth.getCurrentUser();
	if (!user) return redirect("/login");

	const service = new DashboardService(request);
	const { data: metrics, error } = await service.getMetrics();

	return {
		user,
		metrics,
		error: error?.message || null,
	};
}

export const meta = () => {
	return [{ title: "Dashboard | LeadGuard" }];
};

function MetricCard({
	title,
	value,
	subtitle,
	icon: Icon,
	href,
	accent,
}: {
	title: string;
	value: number | string;
	subtitle?: string;
	icon: React.ComponentType<{ className?: string }>;
	href?: string;
	accent?: string;
}) {
	const content = (
		<Card className={href ? "hover:border-primary/40 transition-colors" : ""}>
			<CardContent className="pt-6">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-sm text-muted-foreground">{title}</p>
						<p className={`text-3xl font-bold mt-1 ${accent || ""}`}>{value}</p>
						{subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
					</div>
					<div className="size-10 rounded-lg bg-muted flex items-center justify-center">
						<Icon className="size-5 text-muted-foreground" />
					</div>
				</div>
			</CardContent>
		</Card>
	);

	if (href) {
		return (
			<Link to={href} className="block">
				{content}
			</Link>
		);
	}
	return content;
}

function formatAction(action: string) {
	return action.replace(/_/g, " ");
}

function timeAgo(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardPage() {
	const { user, metrics, error } = useLoaderData<typeof loader>();

	if (error || !metrics) {
		return (
			<div className="p-6">
				<p className="text-destructive">{error || "Failed to load dashboard"}</p>
			</div>
		);
	}

	const isManager = user.role === "owner" || user.role === "admin";

	return (
		<div className="space-y-8 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight">
					Welcome back, {user.full_name?.split(" ")[0] || "there"}
				</h1>
				<p className="text-muted-foreground">Here’s what’s happening in your workspace today.</p>
			</div>

			{/* Primary metrics */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					title="New leads today"
					value={metrics.newLeadsToday}
					icon={TrendingUp}
					href="/d/opportunities"
				/>
				<MetricCard
					title="Open opportunities"
					value={metrics.openOpportunities}
					subtitle={`${metrics.unacknowledged} unacknowledged`}
					icon={Briefcase}
					href="/d/opportunities?unacknowledged=true"
				/>
				{isManager && (
					<MetricCard
						title="Recovery queue"
						value={metrics.recoveryCount}
						subtitle="Needs attention"
						icon={AlertTriangle}
						href="/d/recovery"
						accent={metrics.recoveryCount > 0 ? "text-destructive" : ""}
					/>
				)}
				<MetricCard
					title="Escalations (24h)"
					value={metrics.escalationsLast24h}
					icon={Zap}
					href={isManager ? "/d/recovery" : undefined}
				/>
			</div>

			{/* Team + won */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{isManager && (
					<>
						<MetricCard
							title="Team members"
							value={metrics.teamMembers}
							subtitle={`${metrics.availableMembers} available`}
							icon={Users}
							href="/d/team"
						/>
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-muted-foreground mb-3">Team availability</p>
								<div className="space-y-2">
									{(
										[
											[
												"available",
												metrics.availabilityBreakdown.available,
												"bg-emerald-500",
											],
											["busy", metrics.availabilityBreakdown.busy, "bg-amber-500"],
											[
												"on leave",
												metrics.availabilityBreakdown.on_leave,
												"bg-blue-500",
											],
											[
												"offline",
												metrics.availabilityBreakdown.offline,
												"bg-slate-400",
											],
										] as const
									).map(([label, count, color]) => (
										<div
											key={label}
											className="flex items-center justify-between text-sm"
										>
											<span className="flex items-center gap-2 capitalize">
												<span className={`size-2 rounded-full ${color}`} />
												{label}
											</span>
											<span className="font-medium">{count}</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</>
				)}
				<MetricCard
					title="Won this month"
					value={metrics.wonThisMonth}
					icon={CheckCircle2}
					accent="text-emerald-600"
				/>
				<MetricCard
					title="Unacknowledged"
					value={metrics.unacknowledged}
					icon={Clock}
					href="/d/opportunities?unacknowledged=true"
					accent={metrics.unacknowledged > 0 ? "text-amber-600" : ""}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* My open leads */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
						<CardTitle className="text-base font-semibold">My open leads</CardTitle>
						<Button variant="ghost" size="sm" asChild>
							<Link to="/d/opportunities?assignedToMe=true">
								View all <ArrowRight className="size-4 ml-1" />
							</Link>
						</Button>
					</CardHeader>
					<CardContent className="p-0">
						{metrics.myOpenLeads.length === 0 ? (
							<div className="px-6 py-10 text-center text-sm text-muted-foreground">
								No open leads assigned to you
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Lead</TableHead>
										<TableHead>Stage</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{metrics.myOpenLeads.map((lead: any) => (
										<TableRow key={lead.id}>
											<TableCell>
												<div className="font-medium text-sm">{lead.title}</div>
												<div className="text-xs text-muted-foreground">
													{lead.contact_name}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="secondary" className="capitalize text-xs">
													{lead.stage}
												</Badge>
											</TableCell>
											<TableCell>
												{lead.acknowledged_at ? (
													<span className="text-xs text-emerald-600 flex items-center gap-1">
														<CheckCircle2 className="size-3" /> Ack
													</span>
												) : (
													<span className="text-xs text-amber-600 flex items-center gap-1">
														<Clock className="size-3" /> Pending
													</span>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				{/* Recent activity */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
						<CardTitle className="text-base font-semibold flex items-center gap-2">
							<Activity className="size-4" />
							Recent activity
						</CardTitle>
					</CardHeader>
					<CardContent>
						{metrics.recentActivity.length === 0 ? (
							<p className="text-sm text-muted-foreground py-6 text-center">No activity yet</p>
						) : (
							<ul className="space-y-3">
								{metrics.recentActivity.map((item: any) => (
									<li
										key={item.id}
										className="flex items-start justify-between gap-3 text-sm"
									>
										<div className="min-w-0">
											<p className="font-medium capitalize">
												{formatAction(item.action)}
											</p>
											<p className="text-xs text-muted-foreground truncate">
												{item.actor_name}
												{item.opportunity_title ? ` · ${item.opportunity_title}` : ""}
											</p>
										</div>
										<span className="text-xs text-muted-foreground whitespace-nowrap">
											{timeAgo(item.created_at)}
										</span>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Quick actions for managers */}
			{isManager && metrics.recoveryCount > 0 && (
				<Card className="border-destructive/30 bg-destructive/5">
					<CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="flex items-start gap-3">
							<AlertTriangle className="size-5 text-destructive mt-0.5" />
							<div>
								<p className="font-semibold">
									{metrics.recoveryCount} lead{metrics.recoveryCount > 1 ? "s" : ""} in
									recovery
								</p>
								<p className="text-sm text-muted-foreground">
									Overdue or multi-escalated leads need your attention.
								</p>
							</div>
						</div>
						<Button asChild variant="destructive">
							<Link to="/d/recovery">Open Recovery Queue</Link>
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
