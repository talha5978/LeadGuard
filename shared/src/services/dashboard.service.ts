import { Service } from "@workspace/shared/services/service.base";
import { ApiError } from "@workspace/shared/utils/ApiError";
import { AuthService } from "@workspace/shared/services/auth.service";

export type DashboardMetrics = {
	newLeadsToday: number;
	openOpportunities: number;
	recoveryCount: number;
	escalationsLast24h: number;
	teamMembers: number;
	availableMembers: number;
	unacknowledged: number;
	wonThisMonth: number;
	myOpenLeads: Array<{
		id: string;
		title: string;
		stage: string;
		acknowledged_at: string | null;
		acknowledgement_deadline: string | null;
		contact_name: string | null;
	}>;
	recentActivity: Array<{
		id: string;
		action: string;
		created_at: string;
		actor_name: string | null;
		opportunity_title: string | null;
	}>;
	availabilityBreakdown: {
		available: number;
		busy: number;
		on_leave: number;
		offline: number;
	};
};

export class DashboardService extends Service {
	private async getCurrentUser() {
		const auth = new AuthService(this.request, {
			supabase: this.supabase,
			headers: this.headers,
		});
		return auth.getCurrentUser();
	}

	async getMetrics(): Promise<{ data: DashboardMetrics | null; error: ApiError | null }> {
		try {
			const { user, error: userError } = await this.getCurrentUser();
			if (userError || !user) {
				return { data: null, error: userError || new ApiError("Unauthorized", 401) };
			}

			const workspaceId = user.workspace_id;
			const isManager = user.role === "owner" || user.role === "admin";

			const now = new Date();
			const startOfToday = new Date(now);
			startOfToday.setHours(0, 0, 0, 0);

			const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

			// ---- Parallel queries ----
			const [newLeadsRes, openRes, unackRes, wonRes, teamRes, escalationsRes, myLeadsRes, activityRes] =
				await Promise.all([
					// New leads today
					this.supabase
						.from(this.OPPORTUNITIES_TABLE)
						.select("id", { count: "exact", head: true })
						.eq("workspace_id", workspaceId)
						.gte("created_at", startOfToday.toISOString()),

					// Open opportunities
					this.supabase
						.from(this.OPPORTUNITIES_TABLE)
						.select("id", { count: "exact", head: true })
						.eq("workspace_id", workspaceId)
						.not("stage", "in", '("won","lost")'),

					// Unacknowledged
					this.supabase
						.from(this.OPPORTUNITIES_TABLE)
						.select("id", { count: "exact", head: true })
						.eq("workspace_id", workspaceId)
						.is("acknowledged_at", null)
						.not("stage", "in", '("won","lost")'),

					// Won this month
					this.supabase
						.from(this.OPPORTUNITIES_TABLE)
						.select("id", { count: "exact", head: true })
						.eq("workspace_id", workspaceId)
						.eq("stage", "won")
						.gte("updated_at", startOfMonth.toISOString()),

					// Team members + status
					this.supabase
						.from(this.PROFILES_TABLE)
						.select("id, status")
						.eq("workspace_id", workspaceId),

					// Escalations last 24h
					this.supabase
						.from(this.ACTIVITY_LOGS_TABLE)
						.select("id", { count: "exact", head: true })
						.eq("workspace_id", workspaceId)
						.eq("action", "escalated")
						.gte("created_at", last24h.toISOString()),

					// My open leads
					this.supabase
						.from(this.OPPORTUNITIES_TABLE)
						.select(
							`
						id, title, stage, acknowledged_at, acknowledgement_deadline,
						contact:contacts(full_name)
					`,
						)
						.eq("workspace_id", workspaceId)
						.eq("assigned_to", user.id)
						.not("stage", "in", '("won","lost")')
						.order("created_at", { ascending: false })
						.limit(8),

					// Recent activity
					this.supabase
						.from(this.ACTIVITY_LOGS_TABLE)
						.select(
							`
						id, action, created_at,
						actor:profiles!activity_logs_actor_id_fkey(full_name),
						opportunity:opportunities(title)
					`,
						)
						.eq("workspace_id", workspaceId)
						.order("created_at", { ascending: false })
						.limit(10),
				]);

			const team = teamRes.data || [];
			const availabilityBreakdown = {
				available: team.filter((t) => t.status === "available").length,
				busy: team.filter((t) => t.status === "busy").length,
				on_leave: team.filter((t) => t.status === "on_leave").length,
				offline: team.filter((t) => t.status === "offline").length,
			};

			// Recovery count (managers only – cheap approximation)
			let recoveryCount = 0;
			if (isManager) {
				const { data: openLeads } = await this.supabase
					.from(this.OPPORTUNITIES_TABLE)
					.select(
						"acknowledged_at, acknowledgement_deadline, escalation_count, updated_at, created_at",
					)
					.eq("workspace_id", workspaceId)
					.not("stage", "in", '("won","lost")');

				const idleMinutes = 30;
				const idleThreshold = new Date(now.getTime() - idleMinutes * 60 * 1000);

				for (const opp of openLeads || []) {
					const overdue =
						!opp.acknowledged_at &&
						opp.acknowledgement_deadline &&
						new Date(opp.acknowledgement_deadline) < now;
					const multi = (opp.escalation_count ?? 0) >= 2;
					const last = opp.updated_at || opp.created_at;
					const idle = last && new Date(last) < idleThreshold && !opp.acknowledged_at;
					if (overdue || multi || idle) recoveryCount++;
				}
			}

			const metrics: DashboardMetrics = {
				newLeadsToday: newLeadsRes.count ?? 0,
				openOpportunities: openRes.count ?? 0,
				recoveryCount,
				escalationsLast24h: escalationsRes.count ?? 0,
				teamMembers: team.length,
				availableMembers: availabilityBreakdown.available,
				unacknowledged: unackRes.count ?? 0,
				wonThisMonth: wonRes.count ?? 0,
				myOpenLeads: (myLeadsRes.data || []).map((l: any) => ({
					id: l.id,
					title: l.title,
					stage: l.stage,
					acknowledged_at: l.acknowledged_at,
					acknowledgement_deadline: l.acknowledgement_deadline,
					contact_name: l.contact?.full_name ?? null,
				})),
				recentActivity: (activityRes.data || []).map((a: any) => ({
					id: a.id,
					action: a.action,
					created_at: a.created_at,
					actor_name: a.actor?.full_name ?? "System",
					opportunity_title: a.opportunity?.title ?? null,
				})),
				availabilityBreakdown,
			};

			return { data: metrics, error: null };
		} catch (err: any) {
			return {
				data: null,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}
}
