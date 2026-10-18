import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useActionData,
	useNavigation,
	useSubmit,
	Form,
	redirect,
} from "react-router";
import { OpportunitiesService } from "@workspace/shared/services/opportunities.service.js";
import { AuthService } from "@workspace/shared/services/auth.service.js";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AlertTriangle, Clock, RefreshCw, UserCheck, CheckCircle2, Zap } from "lucide-react";
import { getCurrentUser } from "@workspace/shared/queries/auth.q.js";

export const meta = () => {
	return [{ title: "Recovery Queue | LeadGuard" }];
};

const REASON_LABELS: Record<string, { label: string; variant: "destructive" | "secondary" | "outline" }> = {
	unacknowledged_overdue: { label: "Overdue", variant: "destructive" },
	multiple_escalations: { label: "Multi-escalated", variant: "secondary" },
	idle_too_long: { label: "Idle too long", variant: "outline" },
};

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { user } = await auth.getCurrentUser();

	if (!user) return redirect("/login");
	if (user.role === "user") return redirect("/d");

	const service = new OpportunitiesService(request);
	const { data: items, error } = await service.getRecoveryQueue(user);

	// Team members for re-assign dropdown
	const { data: members } = await auth.supabase
		.from("profiles")
		.select("id, full_name, email, status")
		.eq("workspace_id", user.workspace_id)
		.order("full_name");

	return {
		items: items || [],
		members: members || [],
		error: error?.message || null,
	};
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent") as string;
	const service = new OpportunitiesService(request);
	const headers = new Headers(request.headers);

	const {
		data: { user },
	} = await getCurrentUser(request, headers);

	if (intent === "run_escalation" && user != null) {
		const result = await service.runEscalationCheck(user);
		if (result.error) {
			return { success: false, error: result.error.message, intent };
		}
		return {
			success: true,
			intent,
			escalated: result.escalated,
			message: result.message,
		};
	}

	if (intent === "acknowledge") {
		const id = formData.get("opportunityId") as string;
		const result = await service.acknowledge(id);
		return {
			success: result.success,
			error: result.error?.message,
			intent,
		};
	}

	if (intent === "reassign") {
		const id = formData.get("opportunityId") as string;
		const assigneeId = formData.get("assigneeId") as string;
		const result = await service.reassign(id, assigneeId, user!);
		return {
			success: result.success,
			error: result.error?.message,
			intent,
		};
	}

	if (intent === "clear") {
		const id = formData.get("opportunityId") as string;
		const result = await service.clearFromRecovery(id, user!);
		return {
			success: result.success,
			error: result.error?.message,
			intent,
		};
	}

	return { success: false, error: "Unknown action" };
}

export default function RecoveryPage() {
	const { items, members } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const submit = useSubmit();
	const isSubmitting = navigation.state === "submitting";

	const [reassignTarget, setReassignTarget] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!actionData) return;

		if (actionData.success) {
			if (actionData.intent === "run_escalation") {
				toast.success(
					actionData.escalated
						? `Escalated ${actionData.escalated} lead(s)`
						: actionData.message || "No leads needed escalation",
				);
			} else if (actionData.intent === "acknowledge") {
				toast.success("Lead acknowledged");
			} else if (actionData.intent === "reassign") {
				toast.success("Lead reassigned");
			} else if (actionData.intent === "clear") {
				toast.success("Removed from recovery queue");
			}
		} else if (actionData.error) {
			toast.error(actionData.error);
		}
	}, [actionData]);

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<AlertTriangle className="size-6 text-destructive" />
						<h1 className="text-2xl font-bold tracking-tight">Recovery Queue</h1>
					</div>
					<p className="text-muted-foreground mt-1">
						Leads that are overdue, multi-escalated, or idle — they need attention now.
					</p>
				</div>

				<Form method="post">
					<input type="hidden" name="intent" value="run_escalation" />
					<Button type="submit" variant="outline" disabled={isSubmitting}>
						<Zap className="size-4 mr-2" />
						{isSubmitting ? "Running..." : "Run Escalation Check"}
					</Button>
				</Form>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold">{items.length}</div>
						<p className="text-sm text-muted-foreground">Items in recovery</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold text-destructive">
							{items.filter((i) => i.reasons.includes("unacknowledged_overdue")).length}
						</div>
						<p className="text-sm text-muted-foreground">Overdue unacknowledged</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold">
							{items.filter((i) => i.reasons.includes("multiple_escalations")).length}
						</div>
						<p className="text-sm text-muted-foreground">Multi-escalated</p>
					</CardContent>
				</Card>
			</div>

			{/* Table */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Recovery items</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Lead</TableHead>
								<TableHead>Contact</TableHead>
								<TableHead>Current Owner</TableHead>
								<TableHead>Reasons</TableHead>
								<TableHead>Escalations</TableHead>
								<TableHead>Overdue</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="h-40 text-center">
										<div className="flex flex-col items-center gap-2 text-muted-foreground">
											<CheckCircle2 className="size-8 text-emerald-500" />
											<p className="font-medium text-foreground">
												Recovery queue is empty
											</p>
											<p className="text-sm">All leads are being handled on time.</p>
										</div>
									</TableCell>
								</TableRow>
							) : (
								items.map((item) => (
									<TableRow key={item.id}>
										<TableCell>
											<div className="font-medium">{item.title}</div>
											<div className="text-xs text-muted-foreground capitalize">
												{item.stage}
											</div>
										</TableCell>
										<TableCell>
											<div>{item.contact?.full_name}</div>
											<div className="text-xs text-muted-foreground">
												{item.contact?.email}
											</div>
										</TableCell>
										<TableCell>
											{item.assignee?.full_name || (
												<span className="text-muted-foreground">Unassigned</span>
											)}
											{/* {item.assignee?.status && (
												<div className="text-xs text-muted-foreground capitalize">
													{item.assignee.status}
												</div>
											)} */}
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{item.reasons.map((r) => (
													<Badge
														key={r}
														variant={REASON_LABELS[r]?.variant || "outline"}
													>
														{REASON_LABELS[r]?.label || r}
													</Badge>
												))}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline">{item.escalation_count}</Badge>
										</TableCell>
										<TableCell>
											{item.minutes_overdue != null ? (
												<span className="inline-flex items-center gap-1 text-destructive text-sm">
													<Clock className="size-3.5" />
													{item.minutes_overdue}m
												</span>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex flex-col sm:flex-row gap-2 justify-end items-end">
												{/* Reassign */}
												<div className="flex gap-1">
													<Select
														value={reassignTarget[item.id] || ""}
														onValueChange={(v: any) =>
															setReassignTarget((prev) => ({
																...prev,
																[item.id]: v,
															}))
														}
													>
														<SelectTrigger className="w-[140px] h-8">
															<SelectValue placeholder="Reassign to..." />
														</SelectTrigger>
														<SelectContent>
															{members.map((m: any) => (
																<SelectItem key={m.id} value={m.id}>
																	{m.full_name} ({m.status})
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<Button
														size="sm"
														variant="secondary"
														disabled={!reassignTarget[item.id] || isSubmitting}
														onClick={() => {
															const fd = new FormData();
															fd.append("intent", "reassign");
															fd.append("opportunityId", item.id);
															fd.append("assigneeId", reassignTarget[item.id]);
															submit(fd, { method: "POST" });
														}}
													>
														<RefreshCw className="size-3.5" />
													</Button>
												</div>

												{/* Acknowledge */}
												{!item.acknowledged_at && (
													<Form method="post">
														<input
															type="hidden"
															name="intent"
															value="acknowledge"
														/>
														<input
															type="hidden"
															name="opportunityId"
															value={item.id}
														/>
														<Button
															size="sm"
															type="submit"
															disabled={isSubmitting}
														>
															<UserCheck className="size-3.5 mr-1" />
															Ack
														</Button>
													</Form>
												)}

												{/* Clear */}
												<Form method="post">
													<input type="hidden" name="intent" value="clear" />
													<input
														type="hidden"
														name="opportunityId"
														value={item.id}
													/>
													<Button
														size="sm"
														variant="ghost"
														type="submit"
														disabled={isSubmitting}
													>
														Clear
													</Button>
												</Form>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
