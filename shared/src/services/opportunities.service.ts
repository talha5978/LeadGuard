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

export type RecoveryReason = "unacknowledged_overdue" | "multiple_escalations" | "idle_too_long";

export type RecoveryItem = Opportunity & {
	reasons: RecoveryReason[];
	minutes_overdue: number | null;
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

	async getRecoveryQueue(user: AppUser) {
		try {
			if (!user) {
				return { data: [], error: new ApiError("Unauthorized", 401) };
			}

			if (user.role === "user") {
				return {
					data: [],
					error: new ApiError("Only owners and admins can view recovery queue", 403),
				};
			}

			// Workspace config
			const { data: _workspace } = await this.supabase
				.from(this.WORKSPACES_TABLE)
				.select("idle_period_minutes, acknowledgement_window_seconds")
				.eq("id", user.workspace_id)
				.single();

			const idleMinutes = Number(process.env.IDLE_PERIOD_MINUTES) ?? 30;
			const now = new Date();
			const idleThreshold = new Date(now.getTime() - idleMinutes * 60 * 1000);

			const { data, error } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.select(
					`
					*,
					contact:contacts(id, full_name, email, phone),
					assignee:profiles!opportunities_assigned_to_fkey(id, full_name, email, status)
				`,
				)
				.eq("workspace_id", user.workspace_id)
				.not("stage", "in", '("won","lost")')
				.order("acknowledgement_deadline", { ascending: true, nullsFirst: false });

			if (error) {
				return { data: [], error: new ApiError(error.message, 500) };
			}

			const items: RecoveryItem[] = [];

			for (const opp of data || []) {
				const reasons: RecoveryReason[] = [];

				// A) Unacknowledged past deadline
				const isOverdue =
					!opp.acknowledged_at &&
					opp.acknowledgement_deadline &&
					new Date(opp.acknowledgement_deadline) < now;

				if (isOverdue) {
					reasons.push("unacknowledged_overdue");
				}

				// B) Escalated 2+ times
				if ((opp.escalation_count ?? 0) >= 2) {
					reasons.push("multiple_escalations");
				}

				// C) Idle too long
				const lastAction = opp.updated_at;
				if (lastAction && new Date(lastAction) < idleThreshold && !opp.acknowledged_at) {
					reasons.push("idle_too_long");
				}

				if (reasons.length === 0) continue;

				const minutesOverdue = opp.acknowledgement_deadline
					? Math.max(
							0,
							Math.floor(
								(now.getTime() - new Date(opp.acknowledgement_deadline).getTime()) / 60000,
							),
						)
					: null;

				items.push({
					...(opp as Opportunity),
					reasons,
					minutes_overdue: minutesOverdue,
				});
			}

			// Keep flag in sync
			const recoveryIds = items.map((i) => i.id);
			if (recoveryIds.length > 0) {
				await this.supabase
					.from(this.OPPORTUNITIES_TABLE)
					.update({ is_in_recovery: true })
					.in("id", recoveryIds)
					.eq("workspace_id", user.workspace_id);
			}

			return { data: items, error: null };
		} catch (err: any) {
			return {
				data: [],
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Count recovery items (for dashboard)
	 */
	async getRecoveryCount(user: AppUser) {
		const result = await this.getRecoveryQueue(user);
		if (result.error) return { count: 0, error: result.error };
		return { count: result.data.length, error: null };
	}

	/**
	 * Re-assign from Recovery Queue
	 */
	async reassign(opportunityId: string, newAssigneeId: string, user: AppUser) {
		try {
			if (!user) {
				return { success: false, error: new ApiError("Unauthorized", 401) };
			}

			if (user.role === "user") {
				return { success: false, error: new ApiError("Permission denied", 403) };
			}

			const { data: opp, error: fetchError } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.select("id, assigned_to, escalation_count, workspace_id")
				.eq("id", opportunityId)
				.eq("workspace_id", user.workspace_id)
				.single();

			if (fetchError || !opp) {
				return { success: false, error: new ApiError("Opportunity not found", 404) };
			}

			// Validate new assignee belongs to workspace + is available ideally
			const { data: assignee } = await this.supabase
				.from(this.PROFILES_TABLE)
				.select("id, full_name, status")
				.eq("id", newAssigneeId)
				.eq("workspace_id", user.workspace_id)
				.single();

			if (!assignee) {
				return { success: false, error: new ApiError("Assignee not found", 404) };
			}

			const { data: workspace } = await this.supabase
				.from(this.WORKSPACES_TABLE)
				.select("acknowledgement_window_seconds")
				.eq("id", user.workspace_id)
				.single();

			const windowSeconds = workspace?.acknowledgement_window_seconds ?? 60;
			const now = new Date();
			const deadline = new Date(now.getTime() + windowSeconds * 1000);

			const { error: updateError } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.update({
					assigned_to: newAssigneeId,
					assigned_at: now.toISOString(),
					acknowledged_at: null,
					acknowledgement_deadline: deadline.toISOString(),
					updated_at: now.toISOString(),

					// keep escalation_count – this is a manual reassignment
					is_in_recovery: (opp.escalation_count ?? 0) >= 2,
				})
				.eq("id", opportunityId);

			if (updateError) {
				return { success: false, error: new ApiError(updateError.message, 500) };
			}

			await this.supabase.from(this.ACTIVITY_LOGS_TABLE).insert({
				workspace_id: user.workspace_id,
				opportunity_id: opportunityId,
				actor_id: user.id,
				action: "reassigned",
				details: {
					from: opp.assigned_to,
					to: newAssigneeId,
					source: "recovery_queue",
				},
			});

			// Optional: create in-app notification for new owner
			await this.supabase.from(this.NOTIFICATIONS_TABLE).insert({
				workspace_id: user.workspace_id,
				user_id: newAssigneeId,
				title: "Lead assigned to you",
				body: "A lead was reassigned to you from the Recovery Queue",
				link: `/d/opportunities`,
				type: "assignment",
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
	 * Run escalation for all overdue leads in workspace (demo / cron style)
	 */
	async runEscalationCheck(user: AppUser) {
		try {
			if (!user) {
				return { escalated: 0, error: new ApiError("Unauthorized", 401) };
			}

			if (user.role === "user") {
				return { escalated: 0, error: new ApiError("Permission denied", 403) };
			}

			const now = new Date().toISOString();

			// Overdue & unacknowledged
			const { data: overdue, error } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.select("id, assigned_to, escalation_count, contact_id")
				.eq("workspace_id", user.workspace_id)
				.is("acknowledged_at", null)
				.lt("acknowledgement_deadline", now)
				.not("stage", "in", '("won","lost")');

			if (error) {
				return { escalated: 0, error: new ApiError(error.message, 500) };
			}

			if (!overdue || overdue.length === 0) {
				return { escalated: 0, error: null };
			}

			// Available employees
			const { data: available } = await this.supabase
				.from(this.PROFILES_TABLE)
				.select("id")
				.eq("workspace_id", user.workspace_id)
				.eq("status", "available")
				.order("created_at", { ascending: true });

			const availableIds = (available || []).map((p) => p.id);
			if (availableIds.length === 0) {
				// No one available → mark all as recovery
				await this.supabase
					.from(this.OPPORTUNITIES_TABLE)
					.update({ is_in_recovery: true })
					.in(
						"id",
						overdue.map((o) => o.id),
					);
				return { escalated: 0, error: null, message: "No available employees" };
			}

			const { data: workspace } = await this.supabase
				.from(this.WORKSPACES_TABLE)
				.select("acknowledgement_window_seconds")
				.eq("id", user.workspace_id)
				.single();

			const windowSeconds = workspace?.acknowledgement_window_seconds ?? 60;
			let escalatedCount = 0;

			for (const opp of overdue) {
				// Next assignee = next available after current, or first
				let nextAssignee = availableIds[0];
				if (opp.assigned_to && availableIds.length > 1) {
					const idx = availableIds.indexOf(opp.assigned_to);
					nextAssignee = availableIds[(idx + 1) % availableIds.length];
				}

				// Don't assign to same person if possible
				if (nextAssignee === opp.assigned_to && availableIds.length > 1) {
					nextAssignee = availableIds.find((id) => id !== opp.assigned_to) || nextAssignee;
				}

				const newCount = (opp.escalation_count ?? 0) + 1;
				const deadline = new Date(Date.now() + windowSeconds * 1000).toISOString();

				await this.supabase
					.from(this.OPPORTUNITIES_TABLE)
					.update({
						assigned_to: nextAssignee,
						assigned_at: new Date().toISOString(),
						acknowledged_at: null,
						acknowledgement_deadline: deadline,
						escalation_count: newCount,
						is_in_recovery: newCount >= 2,
						updated_at: new Date().toISOString(),
					})
					.eq("id", opp.id);

				await this.supabase.from(this.ACTIVITY_LOGS_TABLE).insert({
					workspace_id: user.workspace_id,
					opportunity_id: opp.id,
					contact_id: opp.contact_id,
					actor_id: null, // system
					action: "escalated",
					details: {
						from: opp.assigned_to,
						to: nextAssignee,
						escalation_count: newCount,
					},
				});

				await this.supabase.from(this.NOTIFICATIONS_TABLE).insert({
					workspace_id: user.workspace_id,
					user_id: nextAssignee,
					title: "Lead escalated to you",
					body: `A lead was escalated (level ${newCount}) because it was not acknowledged in time.`,
					link: `/d/opportunities`,
					type: "escalation",
				});

				escalatedCount++;
			}

			return { escalated: escalatedCount, error: null };
		} catch (err: any) {
			return {
				escalated: 0,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Clear from recovery (after manager handles it)
	 */
	async clearFromRecovery(opportunityId: string, user: AppUser) {
		try {
			if (!user) {
				return { success: false, error: new ApiError("Unauthorized", 401) };
			}

			if (user.role === "user") {
				return { success: false, error: new ApiError("Permission denied", 403) };
			}

			const { error } = await this.supabase
				.from(this.OPPORTUNITIES_TABLE)
				.update({
					is_in_recovery: false,
					updated_at: new Date().toISOString(),
				})
				.eq("id", opportunityId)
				.eq("workspace_id", user.workspace_id);

			if (error) {
				return { success: false, error: new ApiError(error.message, 500) };
			}

			await this.supabase.from(this.ACTIVITY_LOGS_TABLE).insert({
				workspace_id: user.workspace_id,
				opportunity_id: opportunityId,
				actor_id: user.id,
				action: "cleared_from_recovery",
				details: {},
			});

			return { success: true, error: null };
		} catch (err: any) {
			return {
				success: false,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}
}
