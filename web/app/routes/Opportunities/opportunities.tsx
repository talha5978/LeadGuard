import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useSearchParams,
	useNavigation,
	useSubmit,
	Form,
} from "react-router";
import { opportunitiesQuery } from "@workspace/shared/queries/opportunities.q.js";
import { OpportunitiesService } from "@workspace/shared/services/opportunities.service.js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { CheckCircle2, Clock, Search } from "lucide-react";
import { queryClient } from "@workspace/shared/lib/query-client/queryClient.js";

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);

	const filters = {
		stage: (url.searchParams.get("stage") as any) || "all",
		assignedToMe: url.searchParams.get("assignedToMe") === "true",
		unacknowledged: url.searchParams.get("unacknowledged") === "true",
		search: url.searchParams.get("q") || "",
	};

	const page = Number(url.searchParams.get("page") || 1);

	const result = await queryClient.fetchQuery(
		opportunitiesQuery({
			request,
			filters,
			page,
			pageSize: 20,
		}),
	);

	return {
		opportunities: result.data,
		count: result.count,
		filters,
		page,
	};
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent") as string;
	const opportunityId = formData.get("opportunityId") as string;

	const service = new OpportunitiesService(request);

	if (intent === "acknowledge") {
		const result = await service.acknowledge(opportunityId);
		return result;
	}

	if (intent === "change_stage") {
		const stage = formData.get("stage") as any;
		const result = await service.changeStage(opportunityId, stage);
		return result;
	}

	if (intent === "add_note") {
		const note = formData.get("note") as string;
		const result = await service.addNote(opportunityId, note);
		return result;
	}

	return { success: false, error: "Unknown action" };
}

export default function OpportunitiesPage() {
	const { opportunities, count, filters } = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();
	const navigation = useNavigation();
	const submit = useSubmit();
	const isSubmitting = navigation.state === "submitting";

	const updateFilter = (key: string, value: string | boolean) => {
		const params = new URLSearchParams(searchParams);
		if (value === "" || value === false || value === "all") {
			params.delete(key);
		} else {
			params.set(key, String(value));
		}
		params.delete("page");
		setSearchParams(params);
	};

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
					<p className="text-muted-foreground">
						{count} lead{count !== 1 ? "s" : ""} in your pipeline
					</p>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								placeholder="Search by title or contact..."
								className="pl-9"
								defaultValue={filters.search}
								onChange={(e) => {
									const value = e.target.value;
									// debounce in real app
									updateFilter("q", value);
								}}
							/>
						</div>

						<Select value={filters.stage} onValueChange={(v: any) => updateFilter("stage", v)}>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="Stage" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Stages</SelectItem>
								<SelectItem value="new">New</SelectItem>
								<SelectItem value="contacted">Contacted</SelectItem>
								<SelectItem value="qualified">Qualified</SelectItem>
								<SelectItem value="proposal">Proposal</SelectItem>
								<SelectItem value="won">Won</SelectItem>
								<SelectItem value="lost">Lost</SelectItem>
							</SelectContent>
						</Select>

						<Button
							variant={filters.assignedToMe ? "default" : "outline"}
							onClick={() => updateFilter("assignedToMe", !filters.assignedToMe)}
						>
							Assigned to me
						</Button>

						<Button
							variant={filters.unacknowledged ? "default" : "outline"}
							onClick={() => updateFilter("unacknowledged", !filters.unacknowledged)}
						>
							Unacknowledged
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Table */}
			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Title</TableHead>
								<TableHead>Contact</TableHead>
								<TableHead>Stage</TableHead>
								<TableHead>Assignee</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{opportunities.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
										No opportunities found
									</TableCell>
								</TableRow>
							) : (
								opportunities.map((opp) => (
									<TableRow key={opp.id}>
										<TableCell className="font-medium">{opp.title}</TableCell>
										<TableCell>
											<div>
												<div>{opp.contact?.full_name}</div>
												<div className="text-xs text-muted-foreground">
													{opp.contact?.email}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="secondary" className="capitalize">
												{opp.stage}
											</Badge>
										</TableCell>
										<TableCell>{opp.assignee?.full_name || "—"}</TableCell>
										<TableCell>
											{opp.acknowledged_at ? (
												<span className="inline-flex items-center gap-1 text-green-600 text-sm">
													<CheckCircle2 className="size-3.5" />
													Acknowledged
												</span>
											) : (
												<span className="inline-flex items-center gap-1 text-amber-600 text-sm">
													<Clock className="size-3.5" />
													Pending
												</span>
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												{!opp.acknowledged_at && (
													<Form method="post">
														<input
															type="hidden"
															name="intent"
															value="acknowledge"
														/>
														<input
															type="hidden"
															name="opportunityId"
															value={opp.id}
														/>
														<Button
															size="sm"
															type="submit"
															disabled={isSubmitting}
														>
															Acknowledge
														</Button>
													</Form>
												)}

												<Select
													onValueChange={(stage: any) => {
														const fd = new FormData();
														fd.append("intent", "change_stage");
														fd.append("opportunityId", opp.id);
														fd.append("stage", stage);
														submit(fd, { method: "POST" });
													}}
												>
													<SelectTrigger className="w-[130px] h-8">
														<SelectValue placeholder="Change stage" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="new">New</SelectItem>
														<SelectItem value="contacted">Contacted</SelectItem>
														<SelectItem value="qualified">Qualified</SelectItem>
														<SelectItem value="proposal">Proposal</SelectItem>
														<SelectItem value="won">Won</SelectItem>
														<SelectItem value="lost">Lost</SelectItem>
													</SelectContent>
												</Select>
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
