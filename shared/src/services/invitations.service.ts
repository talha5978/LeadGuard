import { Service } from "@workspace/shared/services/service.base";
import { ApiError } from "@workspace/shared/utils/ApiError";
import { AuthService } from "@workspace/shared/services/auth.service";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export type Invitation = {
	id: string;
	workspace_id: string;
	email: string;
	role: "admin" | "user";
	token: string;
	status: "pending" | "accepted" | "expired" | "revoked";
	expires_at: string;
	created_at: string;
	invited_by?: string | null;
};

export class InvitationsService extends Service {
	private async getCurrentUser() {
		const auth = new AuthService(this.request, {
			supabase: this.supabase,
			headers: this.headers,
		});
		return auth.getCurrentUser();
	}

	private generateToken() {
		return randomBytes(32).toString("hex");
	}

	/**
	 * Create invitation (Owner / Admin only)
	 */
	async createInvitation(input: { email: string; role: "admin" | "user" }) {
		try {
			const { user, error: userError } = await this.getCurrentUser();
			if (userError || !user) {
				return { data: null, error: userError || new ApiError("Unauthorized", 401) };
			}

			if (user.role === "user") {
				return { data: null, error: new ApiError("Only owners and admins can invite", 403) };
			}

			const email = input.email.toLowerCase().trim();

			// Check if already a member
			const { data: existingProfile } = await this.supabase
				.from(this.PROFILES_TABLE)
				.select("id")
				.eq("workspace_id", user.workspace_id)
				.eq("email", email)
				.maybeSingle();

			if (existingProfile) {
				return { data: null, error: new ApiError("This email is already a member", 400) };
			}

			// Check pending invite
			const { data: existingInvite } = await this.supabase
				.from(this.INVITATIONS_TABLE)
				.select("id")
				.eq("workspace_id", user.workspace_id)
				.eq("email", email)
				.eq("status", "pending")
				.maybeSingle();

			if (existingInvite) {
				return { data: null, error: new ApiError("Invitation already sent to this email", 400) };
			}

			const token = this.generateToken();
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

			const { data, error } = await this.supabase
				.from(this.INVITATIONS_TABLE)
				.insert({
					workspace_id: user.workspace_id,
					email,
					role: input.role,
					token,
					invited_by: user.id,
					status: "pending",
					expires_at: expiresAt.toISOString(),
				})
				.select()
				.single();

			if (error) {
				return { data: null, error: new ApiError(error.message, 500) };
			}

			return { data: data as Invitation, error: null };
		} catch (err: any) {
			return {
				data: null,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * List invitations for current workspace
	 */
	async listInvitations() {
		try {
			const { user, error: userError } = await this.getCurrentUser();
			if (userError || !user) {
				return { data: [], error: userError || new ApiError("Unauthorized", 401) };
			}

			if (user.role === "user") {
				return { data: [], error: new ApiError("Permission denied", 403) };
			}

			const { data, error } = await this.supabase
				.from(this.INVITATIONS_TABLE)
				.select("*")
				.eq("workspace_id", user.workspace_id)
				.order("created_at", { ascending: false });

			if (error) {
				return { data: [], error: new ApiError(error.message, 500) };
			}

			return { data: (data || []) as Invitation[], error: null };
		} catch (err: any) {
			return {
				data: [],
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Get invitation by token (public – no auth)
	 */
	async getByToken(token: string) {
		try {
			const { data, error } = await this.supabase
				.from(this.INVITATIONS_TABLE)
				.select(
					`
					*,
					workspace:workspaces(id, name)
				`,
				)
				.eq("token", token)
				.single();

			if (error || !data) {
				return { data: null, error: new ApiError("Invitation not found", 404) };
			}

			if (data.status !== "pending") {
				return { data: null, error: new ApiError("Invitation is no longer valid", 400) };
			}

			if (new Date(data.expires_at) < new Date()) {
				await this.supabase
					.from(this.INVITATIONS_TABLE)
					.update({ status: "expired" })
					.eq("id", data.id);

				return { data: null, error: new ApiError("Invitation has expired", 400) };
			}

			return { data, error: null };
		} catch (err: any) {
			return {
				data: null,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Accept invitation – create profile + set password
	 */
	async acceptInvitation(input: { token: string; full_name: string; password: string }) {
		try {
			const { data: invite, error: inviteError } = await this.getByToken(input.token);

			if (inviteError || !invite) {
				return { success: false, error: inviteError || new ApiError("Invalid invitation", 400) };
			}

			// Check email not already used globally (optional – you can relax this)
			const { data: existing } = await this.supabase
				.from(this.PROFILES_TABLE)
				.select("id")
				.eq("email", invite.email)
				.maybeSingle();

			if (existing) {
				return { success: false, error: new ApiError("Email already registered", 400) };
			}

			const hashedPassword = await bcrypt.hash(input.password, 12);

			// Create profile
			const { data: profile, error: profileError } = await this.supabase
				.from(this.PROFILES_TABLE)
				.insert({
					workspace_id: invite.workspace_id,
					full_name: input.full_name.trim(),
					email: invite.email,
					password: hashedPassword,
					role: invite.role,
					status: "offline",
				})
				.select("id, email, full_name, role, workspace_id")
				.single();

			if (profileError || !profile) {
				return {
					success: false,
					error: new ApiError(profileError?.message || "Failed to create profile", 500),
				};
			}

			// Mark invitation accepted
			await this.supabase
				.from(this.INVITATIONS_TABLE)
				.update({
					status: "accepted",
					accepted_at: new Date().toISOString(),
				})
				.eq("id", invite.id);

			return { success: true, profile, error: null };
		} catch (err: any) {
			return {
				success: false,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500),
			};
		}
	}

	/**
	 * Revoke invitation
	 */
	async revoke(id: string) {
		try {
			const { user, error: userError } = await this.getCurrentUser();
			if (userError || !user) {
				return { success: false, error: userError || new ApiError("Unauthorized", 401) };
			}

			if (user.role === "user") {
				return { success: false, error: new ApiError("Permission denied", 403) };
			}

			const { error } = await this.supabase
				.from(this.INVITATIONS_TABLE)
				.update({ status: "revoked" })
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
