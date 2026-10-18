import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useActionData,
	useNavigation,
	useSubmit,
} from "react-router";
import { InvitationsService } from "@workspace/shared/services/invitations.service.js";
import { AuthService } from "@workspace/shared/services/auth.service.js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "~/components/ui/field";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { UserPlus, Copy, Check, Mail } from "lucide-react";

const inviteSchema = z.object({
	email: z.string().email("Valid email required"),
	role: z.enum(["admin", "user"]),
});

type InviteForm = z.infer<typeof inviteSchema>;

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { user } = await auth.getCurrentUser();

	if (!user || user.role === "user") {
		throw new Response("Forbidden", { status: 403 });
	}

	const inviteSvc = new InvitationsService(request);
	const { data: invitations } = await inviteSvc.listInvitations();

	// Also load current team members
	const { data: members } = await auth.supabase
		.from("profiles")
		.select("id, full_name, email, role, status, created_at")
		.eq("workspace_id", user.workspace_id)
		.order("created_at", { ascending: true });

	return { user, invitations: invitations || [], members: members || [] };
}

export const meta = () => {
	return [{ title: "Invite Team Members | LeadGuard" }];
};

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent") as string;
	const svc = new InvitationsService(request);

	if (intent === "invite") {
		const email = (formData.get("email") as string)?.trim();
		const role = formData.get("role") as "admin" | "user";

		const result = await svc.createInvitation({ email, role });

		if (result.error) {
			return { success: false, error: result.error.message };
		}

		// Build invite link
		const origin = new URL(request.url).origin;
		const inviteUrl = `${origin}/invite/${result.data!.token}`;

		return {
			success: true,
			intent: "invite",
			inviteUrl,
			email,
		};
	}

	if (intent === "revoke") {
		const id = formData.get("id") as string;
		const result = await svc.revoke(id);
		return { success: result.success, error: result.error?.message, intent: "revoke" };
	}

	return { success: false, error: "Unknown action" };
}

export default function TeamPage() {
	const { invitations, members } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const submit = useSubmit();

	const [open, setOpen] = useState(false);
	const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

	const isSubmitting = navigation.state === "submitting";

	const form = useForm<InviteForm>({
		resolver: zodResolver(inviteSchema),
		defaultValues: { email: "", role: "user" },
	});

	const onInvite = (data: InviteForm) => {
		const fd = new FormData();
		fd.append("intent", "invite");
		fd.append("email", data.email);
		fd.append("role", data.role);
		submit(fd, { method: "POST" });
	};

	useEffect(() => {
		if (actionData?.success && actionData.intent === "invite") {
			toast.success(`Invitation created for ${actionData.email}`);
			setOpen(false);
			form.reset();
		}
		if (actionData?.success && actionData.intent === "revoke") {
			toast.success("Invitation revoked");
		}
		if (actionData && !actionData.success && actionData.error) {
			toast.error(actionData.error);
		}
	}, [actionData]);

	const copyLink = (url: string) => {
		navigator.clipboard.writeText(url);
		setCopiedUrl(url);
		toast.success("Invite link copied");
		setTimeout(() => setCopiedUrl(null), 2000);
	};

	return (
		<div className="space-y-8 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Team</h1>
					<p className="text-muted-foreground">Manage members and invitations</p>
				</div>

				<Dialog open={open} onOpenChange={setOpen}>
					<Button onClick={() => setOpen(true)}>
						<UserPlus className="size-4 mr-2" />
						Invite Member
					</Button>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Invite team member</DialogTitle>
						</DialogHeader>
						<form onSubmit={form.handleSubmit(onInvite)} className="space-y-4">
							<FieldSet>
								<FieldGroup>
									<Controller
										control={form.control}
										name="email"
										render={({ field }) => (
											<Field data-invalid={!!form.formState.errors.email}>
												<FieldLabel htmlFor="email">Email</FieldLabel>
												<Input
													id="email"
													type="email"
													placeholder="colleague@company.com"
													{...field}
												/>
												{form.formState.errors.email && (
													<FieldError>
														{form.formState.errors.email.message}
													</FieldError>
												)}
											</Field>
										)}
									/>
									<Controller
										control={form.control}
										name="role"
										render={({ field }) => (
											<Field>
												<FieldLabel>Role</FieldLabel>
												<Select
													onValueChange={field.onChange}
													defaultValue={field.value}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="user">User</SelectItem>
														<SelectItem value="admin">Admin</SelectItem>
													</SelectContent>
												</Select>
											</Field>
										)}
									/>
								</FieldGroup>
							</FieldSet>
							<DialogFooter>
								<Button type="button" variant="outline" onClick={() => setOpen(false)}>
									Cancel
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Sending..." : "Create Invitation"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{/* Members */}
			<Card>
				<CardHeader>
					<CardTitle>Members ({members.length})</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((m: any) => (
								<TableRow key={m.id}>
									<TableCell className="font-medium">{m.full_name}</TableCell>
									<TableCell>{m.email}</TableCell>
									<TableCell>
										<Badge variant="secondary" className="capitalize">
											{m.role}
										</Badge>
									</TableCell>
									<TableCell className="capitalize">{m.status}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Pending Invitations */}
			<Card>
				<CardHeader>
					<CardTitle>Pending Invitations</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Expires</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invitations.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
										No invitations yet
									</TableCell>
								</TableRow>
							) : (
								invitations.map((inv) => {
									const inviteUrl =
										typeof window !== "undefined"
											? `${window.location.origin}/invite/${inv.token}`
											: `/invite/${inv.token}`;

									return (
										<TableRow key={inv.id}>
											<TableCell>
												<div className="flex items-center gap-2">
													<Mail className="size-4 text-muted-foreground" />
													{inv.email}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="capitalize">
													{inv.role}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge
													variant={
														inv.status === "pending"
															? "default"
															: inv.status === "accepted"
																? "secondary"
																: "destructive"
													}
													className="capitalize"
												>
													{inv.status}
												</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{new Date(inv.expires_at).toLocaleDateString()}
											</TableCell>
											<TableCell className="text-right space-x-2">
												{inv.status === "pending" && (
													<>
														<Button
															size="sm"
															variant="outline"
															onClick={() => copyLink(inviteUrl)}
														>
															{copiedUrl === inviteUrl ? (
																<Check className="size-4" />
															) : (
																<Copy className="size-4" />
															)}
															<span className="ml-1">Copy link</span>
														</Button>
														<form method="post" className="inline">
															<input
																type="hidden"
																name="intent"
																value="revoke"
															/>
															<input type="hidden" name="id" value={inv.id} />
															<Button size="sm" variant="ghost" type="submit">
																Revoke
															</Button>
														</form>
													</>
												)}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Show last created invite URL */}
			{actionData?.success && actionData.inviteUrl && (
				<Card className="border-primary/30 bg-primary/5">
					<CardContent className="pt-6">
						<p className="text-sm font-medium mb-2">Invitation link ready:</p>
						<div className="flex gap-2">
							<code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md overflow-x-auto">
								{actionData.inviteUrl}
							</code>
							<Button size="sm" onClick={() => copyLink(actionData.inviteUrl!)}>
								<Copy className="size-4" />
							</Button>
						</div>
						<p className="text-xs text-muted-foreground mt-2">
							Share this link with {actionData.email}. It expires in 7 days.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
