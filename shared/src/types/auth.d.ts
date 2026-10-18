import type { Session } from "@supabase/supabase-js";
import type { ApiError } from "@workspace/shared/utils/ApiError";

export type UserRole = "owner" | "admin" | "user";
export type UserStatus = "available" | "busy" | "on_leave" | "offline";

export type AppUser = {
	id: string;
	email: string;
	full_name: string | null;
	role: UserRole;
	status: UserStatus;
	workspace_id: string;
	avatar_url: string | null;
	created_at: string;
};

export type GetCurrentUser = {
	user: AppUser | null;
	error: ApiError | null;
};

export type GetSession = {
	session: Session | null;
	error: ApiError | null;
};

export type LoginResult = {
	error: ApiError | null;
	session: Session | null;
	headers: Headers;
};

export type LogoutResult = {
	error: ApiError | null;
	headers: Headers;
};
