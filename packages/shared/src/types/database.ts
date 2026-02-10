/**
 * Supabase Database type definitions for LeonoreVault.
 *
 * Generated manually from the migration schemas.
 * After running Supabase locally, regenerate via:
 *   npx supabase gen types typescript --local > packages/shared/src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          google_refresh_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          google_refresh_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          google_refresh_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          invite_code: string | null;
          invite_expires_at: string | null;
          drive_folder_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          drive_folder_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          invite_code?: string | null;
          invite_expires_at?: string | null;
          drive_folder_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'households_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          household_id: string;
          role: 'admin' | 'member' | 'viewer';
          joined_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id: string;
          role?: 'admin' | 'member' | 'viewer';
          joined_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          household_id?: string;
          role?: 'admin' | 'member' | 'viewer';
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          parent_id: string | null;
          icon: string | null;
          color: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          parent_id?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          parent_id?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'categories_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      locations: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          parent_id: string | null;
          description: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          parent_id?: string | null;
          description?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          parent_id?: string | null;
          description?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'locations_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'locations_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
        ];
      };
      items: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          description: string | null;
          category_id: string | null;
          location_id: string | null;
          quantity: number;
          tags: string[];
          status: 'stored' | 'borrowed' | 'lost' | 'in_lost_found';
          created_by: string;
          borrowed_by: string | null;
          borrow_due_date: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          description?: string | null;
          category_id?: string | null;
          location_id?: string | null;
          quantity?: number;
          tags?: string[];
          status?: 'stored' | 'borrowed' | 'lost' | 'in_lost_found';
          created_by: string;
          borrowed_by?: string | null;
          borrow_due_date?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          description?: string | null;
          category_id?: string | null;
          location_id?: string | null;
          quantity?: number;
          tags?: string[];
          status?: 'stored' | 'borrowed' | 'lost' | 'in_lost_found';
          created_by?: string;
          borrowed_by?: string | null;
          borrow_due_date?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'items_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_borrowed_by_fkey';
            columns: ['borrowed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      attachments: {
        Row: {
          id: string;
          item_id: string;
          drive_file_id: string;
          file_name: string;
          mime_type: string;
          thumbnail_url: string | null;
          web_view_link: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          drive_file_id: string;
          file_name: string;
          mime_type: string;
          thumbnail_url?: string | null;
          web_view_link?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          drive_file_id?: string;
          file_name?: string;
          mime_type?: string;
          thumbnail_url?: string | null;
          web_view_link?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attachments_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attachments_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      item_activities: {
        Row: {
          id: string;
          item_id: string;
          user_id: string;
          action: 'created' | 'updated' | 'moved' | 'status_changed' | 'attachment_added' | 'attachment_removed';
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          user_id: string;
          action: 'created' | 'updated' | 'moved' | 'status_changed' | 'attachment_added' | 'attachment_removed';
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          user_id?: string;
          action?: 'created' | 'updated' | 'moved' | 'status_changed' | 'attachment_added' | 'attachment_removed';
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_activities_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_activities_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_household_member: {
        Args: { h_id: string };
        Returns: boolean;
      };
      get_household_role: {
        Args: { h_id: string };
        Returns: string;
      };
      has_write_access: {
        Args: { h_id: string };
        Returns: boolean;
      };
      is_household_admin: {
        Args: { h_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ─── Convenience Aliases ────────────────────────────────────

/** Shorthand to access any table's Row type */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Shorthand to access any table's Insert type */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Shorthand to access any table's Update type */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
