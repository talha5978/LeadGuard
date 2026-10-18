import { Service } from "@workspace/shared/services/service.base";
import { ApiError } from "@workspace/shared/utils/ApiError";
import { AuthService } from "@workspace/shared/services/auth.service";
import type { Contact, ContactFilters } from "@workspace/shared/types/contact";

export class ContactsService extends Service {
	private async getCurrentUser() {
		const auth = new AuthService(this.request, {
			supabase: this.supabase,
			headers: this.headers,
		});
		return auth.getCurrentUser();
	}

	/**
	 * Get all contacts with filters + pagination
	 */
	async getAll(filters: ContactFilters = {}, page = 1, pageSize = 20) {
		try {
			const { user, error: userError } = await this.getCurrentUser();
			if (userError || !user) {
				return { data: [], count: 0, error: userError || new ApiError("Unauthorized", 401) };
			}

			let query = this.supabase
				.from(this.CONTACTS_TABLE)
				.select(
					`
					*,
					assignee:profiles!contacts_assigned_to_fkey(id, full_name, email)
				`,
					{ count: "exact" },
				)
				.eq("workspace_id", user.workspace_id)
				.order("created_at", { ascending: false });

			if (filters.assignedToMe) {
				query = query.eq("assigned_to", user.id);
			}

			if (filters.search) {
				query = query.or(
					`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`,
				);
			}

			const from = (page - 1) * pageSize;
			const to = from + pageSize - 1;
			query = query.range(from, to);

			const { data, error, count } = await query;

			if (error) {
				return { data: [], count: 0, error: new ApiError(error.message, 500) };
			}

			return {
				data: (data || []) as Contact[],
				count: count || 0,
				error: null,
			};
		} catch (err: any) {
			return {
				data: [],
				count: 0,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Get single contact by id
	 */
	async getById(id: string) {
		try {
			const { user, error: userError } = await this.getCurrentUser();
			if (userError || !user) {
				return { data: null, error: userError || new ApiError("Unauthorized", 401) };
			}

			const { data, error } = await this.supabase
				.from(this.CONTACTS_TABLE)
				.select(
					`
					*,
					assignee:profiles!contacts_assigned_to_fkey(id, full_name, email)
				`,
				)
				.eq("id", id)
				.eq("workspace_id", user.workspace_id)
				.single();

			if (error || !data) {
				return { data: null, error: new ApiError(error?.message || "Contact not found", 404) };
			}

			return { data: data as Contact, error: null };
		} catch (err: any) {
			return {
				data: null,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Create a new contact
	 */
	async create(input: {
		full_name: string;
		email?: string;
		phone?: string;
		source?: string;
		assigned_to?: string | null;
	}) {
		try {
			const { user, error: userError } = await this.getCurrentUser();
			if (userError || !user) {
				return { data: null, error: userError || new ApiError("Unauthorized", 401) };
			}

			const { data, error } = await this.supabase
				.from(this.CONTACTS_TABLE)
				.insert({
					workspace_id: user.workspace_id,
					full_name: input.full_name.trim(),
					email: input.email?.trim() || null,
					phone: input.phone?.trim() || null,
					source: input.source || "manual",
					assigned_to: input.assigned_to || user.id,
				})
				.select()
				.single();

			if (error) {
				return { data: null, error: new ApiError(error.message, 500) };
			}

			// Activity log
			await this.supabase.from(this.ACTIVITY_LOGS_TABLE).insert({
				workspace_id: user.workspace_id,
				contact_id: data.id,
				actor_id: user.id,
				action: "contact_created",
				details: { full_name: data.full_name, source: data.source },
			});

			return { data: data as Contact, error: null };
		} catch (err: any) {
			return {
				data: null,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Public lead capture (no auth required)
	 * Used by the homepage form
	 */
	async createPublicLead(input: {
		full_name: string;
		email?: string;
		phone?: string;
		message?: string;
		workspace_id?: string; // optional – if not provided we take the first workspace (demo)
	}) {
		try {
			// 1. Resolve workspace
			let workspaceId = input.workspace_id;

			if (!workspaceId) {
				const { data: workspace } = await this.supabase
					.from(this.WORKSPACES_TABLE)
					.select("id, acknowledgement_window_seconds")
					.order("created_at", { ascending: true })
					.limit(1)
					.single();

				if (!workspace) {
					return { success: false, error: "No workspace found" };
				}
				workspaceId = workspace.id;
			}

			const { data: workspaceConfig } = await this.supabase
				.from(this.WORKSPACES_TABLE)
				.select("acknowledgement_window_seconds")
				.eq("id", workspaceId)
				.single();

			const windowSeconds = workspaceConfig?.acknowledgement_window_seconds || 60;

			// 2. Find an Available employee (simple round-robin for demo)
			const { data: availableEmployees } = await this.supabase
				.from(this.PROFILES_TABLE)
				.select("id")
				.eq("workspace_id", workspaceId)
				.eq("status", "available")
				.order("created_at", { ascending: true });

			const assigneeId = availableEmployees?.[0]?.id || null;

			// 3. Create Contact
			const { data: contact, error: contactError } = await this.supabase
				.from(this.CONTACTS_TABLE)
				.insert({
					workspace_id: workspaceId,
					full_name: input.full_name.trim(),
					email: input.email?.trim() || null,
					phone: input.phone?.trim() || null,
					source: "web_form",
					assigned_to: assigneeId,
				})
				.select()
				.single();

			if (contactError || !contact) {
				return { success: false, error: contactError?.message || "Failed to create contact" };
			}

			// 4. Create Opportunity
			const now = new Date();
			const deadline = new Date(now.getTime() + windowSeconds * 1000);

			const title = input.message
				? input.message.slice(0, 80)
				: `Website inquiry from ${input.full_name}`;

			const { data: opportunity, error: oppError } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.insert({
					workspace_id: workspaceId,
					contact_id: contact.id,
					title,
					stage: "new",
					assigned_to: assigneeId,
					assigned_at: assigneeId ? now.toISOString() : null,
					acknowledgement_deadline: assigneeId ? deadline.toISOString() : null,
					escalation_count: 0,
					is_in_recovery: false,
				})
				.select()
				.single();

			if (oppError || !opportunity) {
				return { success: false, error: oppError?.message || "Failed to create opportunity" };
			}

			// 5. Activity log
			await this.supabase.from(this.ACTIVITY_LOGS_TABLE).insert({
				workspace_id: workspaceId,
				opportunity_id: opportunity.id,
				contact_id: contact.id,
				actor_id: null, // system
				action: "lead_captured",
				details: {
					source: "web_form",
					full_name: input.full_name,
					message: input.message || null,
				},
			});

			return {
				success: true,
				contact,
				opportunity,
				error: null,
			};
		} catch (err: any) {
			return {
				success: false,
				error: err.message || "Something went wrong",
			};
		}
	}

	/**
	 * Update contact
	 */
	async update(
		id: string,
		input: {
			full_name?: string;
			email?: string | null;
			phone?: string | null;
			assigned_to?: string | null;
		},
	) {
		try {
			const { user, error: userError } = await this.getCurrentUser();
			if (userError || !user) {
				return { data: null, error: userError || new ApiError("Unauthorized", 401) };
			}

			const { data, error } = await this.supabase
				.from(this.CONTACTS_TABLE)
				.update({
					...(input.full_name !== undefined && { full_name: input.full_name.trim() }),
					...(input.email !== undefined && { email: input.email }),
					...(input.phone !== undefined && { phone: input.phone }),
					...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
				})
				.eq("id", id)
				.eq("workspace_id", user.workspace_id)
				.select()
				.single();

			if (error) {
				return { data: null, error: new ApiError(error.message, 500) };
			}

			return { data: data as Contact, error: null };
		} catch (err: any) {
			return {
				data: null,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Delete contact
	 */
	async delete(id: string) {
		try {
			const { user, error: userError } = await this.getCurrentUser();
			if (userError || !user) {
				return { success: false, error: userError || new ApiError("Unauthorized", 401) };
			}

			// Only owner/admin can delete
			if (user.role === "user") {
				return { success: false, error: new ApiError("Permission denied", 403) };
			}

			const { error } = await this.supabase
				.from(this.CONTACTS_TABLE)
				.delete()
				.eq("id", id)
				.eq("workspace_id", user.workspace_id);

			if (error) {
				return { success: false, error: new ApiError(error.message, 500) };
			}

			return { success: true, error: null };
		} catch (err: any) {
			return {
				success: false,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}
}
