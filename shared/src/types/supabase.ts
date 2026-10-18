export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "14.18";
	};
	public: {
		Tables: {
			activity_logs: {
				Row: {
					action: string;
					actor_id: string | null;
					contact_id: string | null;
					created_at: string;
					details: Json | null;
					id: string;
					opportunity_id: string | null;
					workspace_id: string;
				};
				Insert: {
					action: string;
					actor_id?: string | null;
					contact_id?: string | null;
					created_at?: string;
					details?: Json | null;
					id?: string;
					opportunity_id?: string | null;
					workspace_id: string;
				};
				Update: {
					action?: string;
					actor_id?: string | null;
					contact_id?: string | null;
					created_at?: string;
					details?: Json | null;
					id?: string;
					opportunity_id?: string | null;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "activity_logs_actor_id_fkey";
						columns: ["actor_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "activity_logs_contact_id_fkey";
						columns: ["contact_id"];
						isOneToOne: false;
						referencedRelation: "contacts";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "activity_logs_opportunity_id_fkey";
						columns: ["opportunity_id"];
						isOneToOne: false;
						referencedRelation: "opportunities";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "activity_logs_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			contacts: {
				Row: {
					assigned_to: string | null;
					created_at: string;
					email: string | null;
					full_name: string;
					id: string;
					phone: string | null;
					source: string | null;
					updated_at: string;
					workspace_id: string;
				};
				Insert: {
					assigned_to?: string | null;
					created_at?: string;
					email?: string | null;
					full_name: string;
					id?: string;
					phone?: string | null;
					source?: string | null;
					updated_at?: string;
					workspace_id: string;
				};
				Update: {
					assigned_to?: string | null;
					created_at?: string;
					email?: string | null;
					full_name?: string;
					id?: string;
					phone?: string | null;
					source?: string | null;
					updated_at?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "contacts_assigned_to_fkey";
						columns: ["assigned_to"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "contacts_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			notifications: {
				Row: {
					body: string | null;
					created_at: string;
					id: string;
					is_read: boolean;
					link: string | null;
					title: string;
					type: string | null;
					user_id: string;
					workspace_id: string;
				};
				Insert: {
					body?: string | null;
					created_at?: string;
					id?: string;
					is_read?: boolean;
					link?: string | null;
					title: string;
					type?: string | null;
					user_id: string;
					workspace_id: string;
				};
				Update: {
					body?: string | null;
					created_at?: string;
					id?: string;
					is_read?: boolean;
					link?: string | null;
					title?: string;
					type?: string | null;
					user_id?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "notifications_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "notifications_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			opportunities: {
				Row: {
					acknowledged_at: string | null;
					acknowledgement_deadline: string | null;
					assigned_at: string | null;
					assigned_to: string | null;
					contact_id: string;
					created_at: string;
					escalation_count: number;
					id: string;
					is_in_recovery: boolean;
					stage: string;
					title: string;
					updated_at: string;
					value: number | null;
					workspace_id: string;
				};
				Insert: {
					acknowledged_at?: string | null;
					acknowledgement_deadline?: string | null;
					assigned_at?: string | null;
					assigned_to?: string | null;
					contact_id: string;
					created_at?: string;
					escalation_count?: number;
					id?: string;
					is_in_recovery?: boolean;
					stage?: string;
					title: string;
					updated_at?: string;
					value?: number | null;
					workspace_id: string;
				};
				Update: {
					acknowledged_at?: string | null;
					acknowledgement_deadline?: string | null;
					assigned_at?: string | null;
					assigned_to?: string | null;
					contact_id?: string;
					created_at?: string;
					escalation_count?: number;
					id?: string;
					is_in_recovery?: boolean;
					stage?: string;
					title?: string;
					updated_at?: string;
					value?: number | null;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "opportunities_assigned_to_fkey";
						columns: ["assigned_to"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "opportunities_contact_id_fkey";
						columns: ["contact_id"];
						isOneToOne: false;
						referencedRelation: "contacts";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "opportunities_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					created_at: string;
					email: string | null;
					full_name: string | null;
					id: string;
					password: string | null;
					role: string;
					status: string;
					updated_at: string;
					workspace_id: string;
				};
				Insert: {
					avatar_url?: string | null;
					created_at?: string;
					email?: string | null;
					full_name?: string | null;
					id: string;
					password?: string | null;
					role?: string;
					status?: string;
					updated_at?: string;
					workspace_id: string;
				};
				Update: {
					avatar_url?: string | null;
					created_at?: string;
					email?: string | null;
					full_name?: string | null;
					id?: string;
					password?: string | null;
					role?: string;
					status?: string;
					updated_at?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "profiles_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			workspaces: {
				Row: {
					acknowledgement_window_seconds: number;
					created_at: string;
					escalation_levels: number;
					id: string;
					max_open_leads_per_employee: number;
					name: string;
					slug: string | null;
					updated_at: string;
				};
				Insert: {
					acknowledgement_window_seconds?: number;
					created_at?: string;
					escalation_levels?: number;
					id?: string;
					max_open_leads_per_employee?: number;
					name: string;
					slug?: string | null;
					updated_at?: string;
				};
				Update: {
					acknowledgement_window_seconds?: number;
					created_at?: string;
					escalation_levels?: number;
					id?: string;
					max_open_leads_per_employee?: number;
					name?: string;
					slug?: string | null;
					updated_at?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			get_user_workspace_id: { Args: never; Returns: string };
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
	TableName extends (DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never) = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends (DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never) = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {},
	},
} as const;
