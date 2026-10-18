import { type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@workspace/shared/utils/supabase/supabase.server";
import type { Database } from "@workspace/shared/types/supabase";
import type { UserRole } from "@workspace/shared/types/auth";

type ServiceBaseCurrentUser = {
	id: string;
	email: string;
	role: UserRole;
};

export interface ServiceBase {
	supabase: SupabaseClient<Database>;
	headers: Headers;
	request: Request;
	currentUser?: ServiceBaseCurrentUser | null | undefined;
}

export class Service implements ServiceBase {
	supabase;
	readonly headers;
	readonly request;
	currentUser?: ServiceBaseCurrentUser | null | undefined = null;

	// Table names
	protected readonly WORKSPACES_TABLE = "workspaces";
	protected readonly PROFILES_TABLE = "profiles";
	protected readonly CONTACTS_TABLE = "contacts";
	protected readonly OPPORTUNITIES_TABLE = "opportunities";
	protected readonly ACTIVITY_LOGS_TABLE = "activity_logs";
	protected readonly NOTIFICATIONS_TABLE = "notifications";

	constructor(request: Request, opts?: { supabase?: SupabaseClient<Database>; headers?: Headers }) {
		if (opts?.supabase && opts?.headers) {
			this.supabase = opts.supabase;
			this.headers = opts.headers;
		} else {
			const result = createSupabaseServerClient(request);
			this.supabase = result.supabase;
			this.headers = result.headers;
		}
		this.request = request;
	}
}
