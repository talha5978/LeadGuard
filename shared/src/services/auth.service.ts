import { Service } from "@workspace/shared/services/service.base";
import { ApiError } from "@workspace/shared/utils/ApiError";
import type { SignupFormData } from "@workspace/shared/schemas/signup.schema";
import type {
	AppUser,
	GetCurrentUser,
	GetSession,
	LoginResult,
	LogoutResult,
	UserRole,
} from "@workspace/shared/types/auth.d";
import bcrypt from "bcryptjs";
import {
	createSessionCookie,
	destroySessionCookie,
	getUserIdFromRequest,
} from "@workspace/shared/utils/session-cookie";

export class AuthService extends Service {
	private async hashPassword(password: string) {
		return bcrypt.hash(password, 12);
	}

	private async verifyPassword(password: string, hash: string) {
		return bcrypt.compare(password, hash);
	}

	/**
	 * Get current user from session cookie
	 */
	async getCurrentUser(): Promise<GetCurrentUser> {
		try {
			const userId = getUserIdFromRequest(this.request);

			if (!userId) {
				return {
					user: null,
					error: new ApiError("Not authenticated", 401),
				};
			}

			const { data: profile, error } = await this.supabase
				.from(this.PROFILES_TABLE)
				.select(
					`
					id,
					workspace_id,
					full_name,
					email,
					role,
					status,
					avatar_url,
					created_at
				`,
				)
				.eq("id", userId)
				.single();

			if (error || !profile) {
				return {
					user: null,
					error: new ApiError(error?.message || "Profile not found", 401),
				};
			}

			const appUser: AppUser = {
				id: profile.id,
				email: profile.email as string,
				full_name: profile.full_name,
				role: profile.role as UserRole,
				status: profile.status as any,
				workspace_id: profile.workspace_id,
				avatar_url: profile.avatar_url,
				created_at: profile.created_at,
			};

			this.currentUser = {
				id: appUser.id,
				email: appUser.email,
				role: appUser.role,
			};

			return { user: appUser, error: null };
		} catch (err: any) {
			return {
				user: null,
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500, [err]),
			};
		}
	}

	async getSession(): Promise<GetSession> {
		const userId = getUserIdFromRequest(this.request);

		if (!userId) {
			return {
				session: null,
				error: new ApiError("Session not found", 401),
			};
		}

		return {
			session: { user: { id: userId } } as any,
			error: null,
		};
	}

	/**
	 * Login
	 */
	async loginWithPassword({ email, password }: { email: string; password: string }): Promise<LoginResult> {
		try {
			const { data: profile, error } = await this.supabase
				.from(this.PROFILES_TABLE)
				.select("id, email, password")
				.eq("email", email.toLowerCase().trim())
				.single();

			if (error || !profile || !profile.password) {
				return {
					error: new ApiError("Invalid email or password", 401),
					session: null,
					headers: this.headers,
				};
			}

			const isValid = await this.verifyPassword(password, profile.password);

			if (!isValid) {
				return {
					error: new ApiError("Invalid email or password", 401),
					session: null,
					headers: this.headers,
				};
			}

			const cookie = createSessionCookie(profile.id);
			this.headers.append("Set-Cookie", cookie);

			return {
				error: null,
				session: { user: { id: profile.id } } as any,
				headers: this.headers,
			};
		} catch (err: any) {
			return {
				error: err instanceof ApiError ? err : new ApiError("Unknown error", 500, [err]),
				session: null,
				headers: this.headers,
			};
		}
	}

	/**
	 * Logout
	 */
	async logout(): Promise<LogoutResult> {
		const cookie = destroySessionCookie();
		this.headers.append("Set-Cookie", cookie);

		return {
			error: null,
			headers: this.headers,
		};
	}

	/**
	 * Signup
	 */
	async signUpWithPasswordAndProfile(data: Omit<SignupFormData, "confirmPassword">): Promise<{
		success: boolean;
		user?: any;
		session?: any;
		error?: string;
		headers?: Headers;
	}> {
		try {
			const email = data.email.toLowerCase().trim();
			const fullName = `${data.firstName} ${data.lastName}`.trim();

			// Check existing email
			const { data: existing } = await this.supabase
				.from(this.PROFILES_TABLE)
				.select("id")
				.eq("email", email)
				.maybeSingle();

			if (existing) {
				return { success: false, error: "Email is already registered" };
			}

			const hashedPassword = await this.hashPassword(data.password);

			// Create workspace
			const workspaceSlug = `${data.firstName.toLowerCase()}-${Date.now().toString().slice(-6)}`;

			const { data: workspace, error: workspaceError } = await this.supabase
				.from(this.WORKSPACES_TABLE)
				.insert({
					name: `${data.firstName}'s Workspace`,
					slug: workspaceSlug,
					max_open_leads_per_employee: 5,
					acknowledgement_window_seconds: 60,
					escalation_levels: 2,
				})
				.select("id")
				.single();

			if (workspaceError || !workspace) {
				return {
					success: false,
					error: workspaceError?.message || "Failed to create workspace",
				};
			}

			// Create profile
			const { data: profile, error: profileError } = await this.supabase
				.from(this.PROFILES_TABLE)
				.insert({
					workspace_id: workspace.id,
					full_name: fullName,
					email,
					password: hashedPassword,
					role: "owner",
					status: "available",
				} as any)
				.select("id, email, full_name, role, workspace_id")
				.single();

			if (profileError || !profile) {
				await this.supabase.from(this.WORKSPACES_TABLE).delete().eq("id", workspace.id);
				return {
					success: false,
					error: profileError?.message || "Failed to create profile",
				};
			}

			// Set session cookie
			const cookie = createSessionCookie(profile.id);
			this.headers.append("Set-Cookie", cookie);

			return {
				success: true,
				user: profile,
				session: { user: { id: profile.id } },
				headers: this.headers,
			};
		} catch (err: any) {
			console.error("Signup error:", err);
			return {
				success: false,
				error: err.message || "An unexpected error occurred during signup",
			};
		}
	}

	async updateProfile(data: {
		full_name?: string;
		status?: "available" | "busy" | "on_leave" | "offline";
		avatar_url?: string | null;
	}) {
		const { user, error: userError } = await this.getCurrentUser();

		if (userError || !user) {
			return {
				data: null,
				error: userError || new ApiError("Not authenticated", 401),
			};
		}

		const { data: updated, error } = await this.supabase
			.from(this.PROFILES_TABLE)
			.update({
				...(data.full_name !== undefined && { full_name: data.full_name }),
				...(data.status !== undefined && { status: data.status }),
				...(data.avatar_url !== undefined && { avatar_url: data.avatar_url }),
			})
			.eq("id", user.id)
			.select()
			.single();

		return {
			data: updated,
			error: error ? new ApiError(error.message, 500) : null,
		};
	}

	async isOwnerOrAdmin(): Promise<boolean> {
		const { user } = await this.getCurrentUser();
		return user?.role === "owner" || user?.role === "admin";
	}
}
