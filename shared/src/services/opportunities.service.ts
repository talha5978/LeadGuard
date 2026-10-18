import { Service } from "@workspace/shared/services/service.base";
import type { AppUser } from "@workspace/shared/types/auth";
import { ApiError } from "@workspace/shared/utils/ApiError";

export type OpportunityStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type OpportunityFilters = {
	stage?: OpportunityStage | "all";
	assignedToMe?: boolean;
	unacknowledged?: boolean;
	search?: string;
};

export type Opportunity = {
	id: string;
	workspace_id: string;
	contact_id: string;
	title: string;
	stage: OpportunityStage;
	value: number | null;
	assigned_to: string | null;
	assigned_at: string | null;
	acknowledged_at: string | null;
	acknowledgement_deadline: string | null;
	escalation_count: number;
	is_in_recovery: boolean;
	created_at: string;
	updated_at: string;
	// joined
	contact?: {
		id: string;
		full_name: string;
		email: string | null;
		phone: string | null;
	};
	assignee?: {
		id: string;
		full_name: string | null;
		email: string;
	};
};

export class OpportunitiesService extends Service {
	/**
	 * Get all opportunities with filters + pagination
	 */
	async getAll(filters: OpportunityFilters = {}, page = 1, pageSize = 20) {
		try {
			const { user, error: userError } = await this.getCurrentUserSafe();
			if (userError || !user) {
				return { data: [], count: 0, error: userError || new ApiError("Unauthorized", 401) };
			}

			let query = this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.select(
					`
					*,
					contact:contacts(id, full_name, email, phone),
					assignee:profiles!opportunities_assigned_to_fkey(id, full_name, email)
				`,
					{ count: "exact" },
				)
				.eq("workspace_id", user.workspace_id)
				.order("created_at", { ascending: false });

			// Filters
			if (filters.stage && filters.stage !== "all") {
				query = query.eq("stage", filters.stage);
			}

			if (filters.assignedToMe) {
				query = query.eq("assigned_to", user.id);
			}

			if (filters.unacknowledged) {
				query = query.is("acknowledged_at", null);
			}

			if (filters.search) {
				query = query.or(
					`title.ilike.%${filters.search}%,contact.full_name.ilike.%${filters.search}%`,
				);
			}

			// Pagination
			const from = (page - 1) * pageSize;
			const to = from + pageSize - 1;
			query = query.range(from, to);

			const { data, error, count } = await query;

			if (error) {
				return { data: [], count: 0, error: new ApiError(error.message, 500) };
			}

			return {
				data: (data || []) as Opportunity[],
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
	 * Acknowledge an opportunity
	 */
	async acknowledge(opportunityId: string) {
		try {
			const { user, error: userError } = await this.getCurrentUserSafe();
			if (userError || !user) {
				return { success: false, error: userError || new ApiError("Unauthorized", 401) };
			}

			const { data: opp, error: fetchError } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.select("id, assigned_to, acknowledged_at, workspace_id")
				.eq("id", opportunityId)
				.eq("workspace_id", user.workspace_id)
				.single();

			if (fetchError || !opp) {
				return { success: false, error: new ApiError("Opportunity not found", 404) };
			}

			if (opp.assigned_to !== user.id && user.role === "user") {
				return {
					success: false,
					error: new ApiError("You can only acknowledge your own leads", 403),
				};
			}

			if (opp.acknowledged_at) {
				return { success: false, error: new ApiError("Already acknowledged", 400) };
			}

			const { error: updateError } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.update({
					acknowledged_at: new Date().toISOString(),
					is_in_recovery: false,
				})
				.eq("id", opportunityId);

			if (updateError) {
				return { success: false, error: new ApiError(updateError.message, 500) };
			}

			// Activity log
			await this.supabase.from(this.ACTIVITY_LOGS_TABLE).insert({
				workspace_id: user.workspace_id,
				opportunity_id: opportunityId,
				actor_id: user.id,
				action: "acknowledged",
				details: { message: "Lead acknowledged" },
			});

			return { success: true, error: null };
		} catch (err: any) {
			return {
				success: false,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Change stage
	 */
	async changeStage(opportunityId: string, stage: OpportunityStage) {
		try {
			const { user, error: userError } = await this.getCurrentUserSafe();
			if (userError || !user) {
				return { success: false, error: userError || new ApiError("Unauthorized", 401) };
			}

			const { data: opp, error: fetchError } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.select("id, stage, workspace_id")
				.eq("id", opportunityId)
				.eq("workspace_id", user.workspace_id)
				.single();

			if (fetchError || !opp) {
				return { success: false, error: new ApiError("Opportunity not found", 404) };
			}

			const { error: updateError } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.update({ stage })
				.eq("id", opportunityId);

			if (updateError) {
				return { success: false, error: new ApiError(updateError.message, 500) };
			}

			await this.supabase.from(this.ACTIVITY_LOGS_TABLE).insert({
				workspace_id: user.workspace_id,
				opportunity_id: opportunityId,
				actor_id: user.id,
				action: "stage_changed",
				details: { from: opp.stage, to: stage },
			});

			return { success: true, error: null };
		} catch (err: any) {
			return {
				success: false,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Add a note
	 */
	async addNote(opportunityId: string, note: string) {
		try {
			const { user, error: userError } = await this.getCurrentUserSafe();
			if (userError || !user) {
				return { success: false, error: userError || new ApiError("Unauthorized", 401) };
			}

			const { data: opp, error: fetchError } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.select("id, workspace_id")
				.eq("id", opportunityId)
				.eq("workspace_id", user.workspace_id)
				.single();

			if (fetchError || !opp) {
				return { success: false, error: new ApiError("Opportunity not found", 404) };
			}

			await this.supabase.from(this.ACTIVITY_LOGS_TABLE).insert({
				workspace_id: user.workspace_id,
				opportunity_id: opportunityId,
				actor_id: user.id,
				action: "note_added",
				details: { note },
			});

			return { success: true, error: null };
		} catch (err: any) {
			return {
				success: false,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	// Helper so we don't depend on AuthService instance methods
	private async getCurrentUserSafe() {
		const { data: profile } = await this.supabase
			.from(this.PROFILES_TABLE)
			.select("id, workspace_id, role, email, full_name")
			// We rely on the session cookie being already validated in the layout
			// For simplicity we re-use the same pattern as AuthService
			.limit(1);

		// Better: import and use AuthService properly
		const auth = new (await import("./auth.service")).AuthService(this.request);
		return auth.getCurrentUser();
	}

	async create(input: {
		contact_id: string;
		title: string;
		stage?: OpportunityStage;
		value?: number | null;
		user: AppUser;
	}) {
		try {
			// Verify contact belongs to same workspace
			const { data: contact, error: contactError } = await this.supabase
				.from(this.CONTACTS_TABLE)
				.select("id")
				.eq("id", input.contact_id)
				.eq("workspace_id", input.user.workspace_id)
				.single();

			if (contactError || !contact) {
				return { data: null, error: new ApiError("Contact not found", 404) };
			}

			const now = new Date();
			const deadline = new Date(now.getTime() + 60 * 1000); // 60 seconds for demo

			const { data, error } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.insert({
					workspace_id: input.user.workspace_id,
					contact_id: input.contact_id,
					title: input.title.trim(),
					stage: input.stage || "new",
					value: input.value ?? null,
					assigned_to: input.user.id,
					assigned_at: now.toISOString(),
					acknowledgement_deadline: deadline.toISOString(),
					escalation_count: 0,
					is_in_recovery: false,
				})
				.select()
				.single();

			if (error) {
				return { data: null, error: new ApiError(error.message, 500) };
			}

			// Activity log
			await this.supabase.from(this.ACTIVITY_LOGS_TABLE).insert({
				workspace_id: input.user.workspace_id,
				opportunity_id: data.id,
				contact_id: input.contact_id,
				actor_id: input.user.id,
				action: "opportunity_created",
				details: { title: data.title, stage: data.stage },
			});

			return { data, error: null };
		} catch (err: any) {
			return {
				data: null,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}
}
