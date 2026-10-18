export type ContactFilters = {
	search?: string;
	assignedToMe?: boolean;
};

export type Contact = {
	id: string;
	workspace_id: string;
	full_name: string;
	email: string | null;
	phone: string | null;
	source: string | null;
	assigned_to: string | null;
	created_at: string;
	updated_at: string;
	assignee?: {
		id: string;
		full_name: string | null;
		email: string;
	} | null;
};
