import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useSearchParams,
	useNavigation,
	useSubmit,
	useActionData,
} from "react-router";
import { ContactsService } from "@workspace/shared/services/contacts.service.js";
import { OpportunitiesService } from "@workspace/shared/services/opportunities.service.js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Card, CardContent } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "~/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Plus, Search, User, Mail, Phone, Briefcase } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { contactsQuery } from "@workspace/shared/queries/contacts.q.js";
import { queryClient } from "@workspace/shared/lib/query-client/queryClient.js";
import { getCurrentUser } from "@workspace/shared/queries/auth.q.js";

const createContactSchema = z.object({
	full_name: z.string().min(2, "Name is required"),
	email: z.string().email("Invalid email").optional().or(z.literal("")),
	phone: z.string().optional(),
	source: z.string().optional(),
});

const createOpportunitySchema = z.object({
	title: z.string().min(3, "Title is required"),
	stage: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]),
	value: z.string().optional(),
});

type CreateContactForm = z.infer<typeof createContactSchema>;
type CreateOpportunityForm = z.infer<typeof createOpportunitySchema>;

export const meta = () => {
	return [{ title: "Contacts | LeadGuard" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);

	const filters = {
		search: url.searchParams.get("q") || "",
		assignedToMe: url.searchParams.get("assignedToMe") === "true",
	};

	const page = Number(url.searchParams.get("page") || 1);

	const result = await queryClient.fetchQuery(
		contactsQuery({
			request,
			filters,
			page,
			pageSize: 20,
		}),
	);

	return {
		contacts: result.data,
		count: result.count,
		filters,
		page,
	};
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "create_contact") {
		const service = new ContactsService(request);
		const full_name = (formData.get("full_name") as string)?.trim();
		const email = (formData.get("email") as string)?.trim() || undefined;
		const phone = (formData.get("phone") as string)?.trim() || undefined;
		const source = (formData.get("source") as string) || "manual";

		if (!full_name) return { success: false, error: "Full name is required" };

		const result = await service.create({ full_name, email, phone, source });
		if (result.error) return { success: false, error: result.error.message };

		await queryClient.invalidateQueries({ queryKey: ["contacts"] });
		return { success: true, intent: "create_contact" };
	}

	if (intent === "create_opportunity") {
		const service = new OpportunitiesService(request);
		const contact_id = formData.get("contact_id") as string;
		const title = (formData.get("title") as string)?.trim();
		const stage = (formData.get("stage") as any) || "new";
		const valueRaw = formData.get("value") as string;
		const value = valueRaw ? Number(valueRaw) : null;

		if (!contact_id || !title) {
			return { success: false, error: "Contact and title are required" };
		}

		const headers = new Headers(request.headers);

		const {
			data: { user },
		} = await getCurrentUser(request, headers);

		if (!user) {
			return { success: false, error: "Unauthorized" };
		}

		const result = await service.create({
			contact_id,
			title,
			stage,
			value,
			user,
		});

		if (result.error) {
			return { success: false, error: result.error.message };
		}

		await queryClient.invalidateQueries({ queryKey: ["opportunities"] });
		return { success: true, intent: "create_opportunity", opportunity: result.data };
	}

	return { success: false, error: "Unknown action" };
}

export default function ContactsPage() {
	const { contacts, count, filters } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const [searchParams, setSearchParams] = useSearchParams();
	const navigation = useNavigation();
	const submit = useSubmit();

	const [createContactOpen, setCreateContactOpen] = useState(false);
	const [viewContact, setViewContact] = useState<(typeof contacts)[0] | null>(null);
	const [createOppOpen, setCreateOppOpen] = useState(false);

	const isSubmitting = navigation.state === "submitting";

	// Create Contact form
	const contactForm = useForm<CreateContactForm>({
		resolver: zodResolver(createContactSchema),
		defaultValues: { full_name: "", email: "", phone: "", source: "manual" },
	});

	// Create Opportunity form
	const oppForm = useForm<CreateOpportunityForm>({
		resolver: zodResolver(createOpportunitySchema),
		defaultValues: { title: "", stage: "new", value: "" },
	});

	const updateFilter = (key: string, value: string | boolean) => {
		const params = new URLSearchParams(searchParams);
		if (value === "" || value === false) params.delete(key);
		else params.set(key, String(value));
		params.delete("page");
		setSearchParams(params);
	};

	const onCreateContact = (data: CreateContactForm) => {
		const fd = new FormData();
		fd.append("intent", "create_contact");
		fd.append("full_name", data.full_name);
		if (data.email) fd.append("email", data.email);
		if (data.phone) fd.append("phone", data.phone);
		fd.append("source", data.source || "manual");
		submit(fd, { method: "POST" });
	};

	const onCreateOpportunity = (data: CreateOpportunityForm) => {
		if (!viewContact) return;

		const fd = new FormData();
		fd.append("intent", "create_opportunity");
		fd.append("contact_id", viewContact.id);
		fd.append("title", data.title);
		fd.append("stage", data.stage);
		if (data.value) fd.append("value", data.value);
		submit(fd, { method: "POST" });
	};

	// Handle action results
	useEffect(() => {
		if (!actionData) return;

		if (actionData.success && actionData.intent === "create_contact") {
			setCreateContactOpen(false);
			contactForm.reset();
			toast.success("Contact created successfully");
		}

		if (actionData.success && actionData.intent === "create_opportunity") {
			setCreateOppOpen(false);
			setViewContact(null);
			oppForm.reset();
			toast.success("Opportunity created successfully");
		}

		if (!actionData.success && actionData.error) {
			toast.error(actionData.error);
		}
	}, [actionData]);

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
					<p className="text-muted-foreground">
						{count} contact{count !== 1 ? "s" : ""} in your workspace
					</p>
				</div>

				{/* Create Contact Dialog */}
				<Dialog open={createContactOpen} onOpenChange={setCreateContactOpen}>
					<Button onClick={() => setCreateContactOpen(true)}>
						<Plus className="size-4 mr-2" />
						Add Contact
					</Button>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add new contact</DialogTitle>
						</DialogHeader>
						<form onSubmit={contactForm.handleSubmit(onCreateContact)} className="space-y-4">
							<FieldSet>
								<FieldGroup>
									<Controller
										control={contactForm.control}
										name="full_name"
										render={({ field }) => (
											<Field data-invalid={!!contactForm.formState.errors.full_name}>
												<FieldLabel htmlFor="full_name">Full name</FieldLabel>
												<Input id="full_name" placeholder="John Smith" {...field} />
												{contactForm.formState.errors.full_name && (
													<FieldError>
														{contactForm.formState.errors.full_name.message}
													</FieldError>
												)}
											</Field>
										)}
									/>
									<Controller
										control={contactForm.control}
										name="email"
										render={({ field }) => (
											<Field>
												<FieldLabel htmlFor="email">Email</FieldLabel>
												<Input
													id="email"
													type="email"
													placeholder="john@company.com"
													{...field}
												/>
											</Field>
										)}
									/>
									<Controller
										control={contactForm.control}
										name="phone"
										render={({ field }) => (
											<Field>
												<FieldLabel htmlFor="phone">Phone</FieldLabel>
												<Input id="phone" placeholder="+92 300 1234567" {...field} />
											</Field>
										)}
									/>
								</FieldGroup>
							</FieldSet>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setCreateContactOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? "Creating..." : "Create Contact"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								placeholder="Search by name, email or phone..."
								className="pl-9"
								defaultValue={filters.search}
								onChange={(e) => updateFilter("q", e.target.value)}
							/>
						</div>
						<Button
							variant={filters.assignedToMe ? "default" : "outline"}
							onClick={() => updateFilter("assignedToMe", !filters.assignedToMe)}
						>
							Assigned to me
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
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Source</TableHead>
								<TableHead>Assignee</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{contacts.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
										No contacts found. Create your first contact.
									</TableCell>
								</TableRow>
							) : (
								contacts.map((contact) => (
									<TableRow key={contact.id}>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												<User className="size-4 text-muted-foreground" />
												{contact.full_name}
											</div>
										</TableCell>
										<TableCell>
											{contact.email ? (
												<span className="flex items-center gap-1.5 text-sm">
													<Mail className="size-3.5" />
													{contact.email}
												</span>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>
											{contact.phone ? (
												<span className="flex items-center gap-1.5 text-sm">
													<Phone className="size-3.5" />
													{contact.phone}
												</span>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>
											<Badge variant="secondary" className="capitalize">
												{contact.source || "manual"}
											</Badge>
										</TableCell>
										<TableCell>{contact.assignee?.full_name || "—"}</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setViewContact(contact)}
											>
												View
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* ========== CONTACT DETAIL DIALOG ========== */}
			<Dialog open={!!viewContact} onOpenChange={(open: boolean) => !open && setViewContact(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Contact Details</DialogTitle>
					</DialogHeader>

					{viewContact && (
						<div className="space-y-4">
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<div className="size-10 rounded-full bg-muted flex items-center justify-center">
										<User className="size-5" />
									</div>
									<div>
										<p className="font-semibold text-lg">{viewContact.full_name}</p>
										<p className="text-sm text-muted-foreground capitalize">
											Source: {viewContact.source || "manual"}
										</p>
									</div>
								</div>

								<div className="grid gap-2 text-sm">
									{viewContact.email && (
										<div className="flex items-center gap-2">
											<Mail className="size-4 text-muted-foreground" />
											<span>{viewContact.email}</span>
										</div>
									)}
									{viewContact.phone && (
										<div className="flex items-center gap-2">
											<Phone className="size-4 text-muted-foreground" />
											<span>{viewContact.phone}</span>
										</div>
									)}
									<div className="flex items-center gap-2">
										<User className="size-4 text-muted-foreground" />
										<span>Assigned to: {viewContact.assignee?.full_name || "—"}</span>
									</div>
								</div>
							</div>

							<DialogFooter className="gap-2">
								<Button variant="outline" onClick={() => setViewContact(null)}>
									Close
								</Button>
								<Button
									onClick={() => {
										setCreateOppOpen(true);
									}}
								>
									<Briefcase className="size-4 mr-2" />
									Create Opportunity
								</Button>
							</DialogFooter>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* ========== CREATE OPPORTUNITY DIALOG ========== */}
			<Dialog open={createOppOpen} onOpenChange={setCreateOppOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Opportunity</DialogTitle>
					</DialogHeader>

					{viewContact && (
						<p className="text-sm text-muted-foreground -mt-2 mb-2">
							For contact: <strong>{viewContact.full_name}</strong>
						</p>
					)}

					<form onSubmit={oppForm.handleSubmit(onCreateOpportunity)} className="space-y-4">
						<FieldSet>
							<FieldGroup>
								<Controller
									control={oppForm.control}
									name="title"
									render={({ field }) => (
										<Field data-invalid={!!oppForm.formState.errors.title}>
											<FieldLabel htmlFor="title">Title</FieldLabel>
											<Input
												id="title"
												placeholder="e.g. Website redesign inquiry"
												{...field}
											/>
											{oppForm.formState.errors.title && (
												<FieldError>
													{oppForm.formState.errors.title.message}
												</FieldError>
											)}
										</Field>
									)}
								/>

								<Controller
									control={oppForm.control}
									name="stage"
									render={({ field }) => (
										<Field>
											<FieldLabel>Stage</FieldLabel>
											<Select onValueChange={field.onChange} defaultValue={field.value}>
												<SelectTrigger>
													<SelectValue placeholder="Select stage" />
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
										</Field>
									)}
								/>

								<Controller
									control={oppForm.control}
									name="value"
									render={({ field }) => (
										<Field>
											<FieldLabel htmlFor="value">Value (optional)</FieldLabel>
											<Input
												id="value"
												type="number"
												placeholder="e.g. 5000"
												{...field}
											/>
										</Field>
									)}
								/>
							</FieldGroup>
						</FieldSet>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setCreateOppOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create Opportunity"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
