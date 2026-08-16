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
      storage_spots: {
        Row: {
          id: string;
          household_id: string;
          qr_token: string;
          name: string;
          parent_id: string | null;
          spot_type: 'room' | 'cabinet' | 'shelf' | 'drawer' | 'box' | 'other';
          description: string | null;
          capacity: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          qr_token?: string;
          name: string;
          parent_id?: string | null;
          spot_type?: 'room' | 'cabinet' | 'shelf' | 'drawer' | 'box' | 'other';
          description?: string | null;
          capacity?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          qr_token?: string;
          name?: string;
          parent_id?: string | null;
          spot_type?: 'room' | 'cabinet' | 'shelf' | 'drawer' | 'box' | 'other';
          description?: string | null;
          capacity?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'storage_spots_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'storage_spots_parent_same_household_fkey';
            columns: ['parent_id', 'household_id'];
            isOneToOne: false;
            referencedRelation: 'storage_spots';
            referencedColumns: ['id', 'household_id'];
          },
        ];
      };
      items: {
        Row: {
          id: string;
          household_id: string;
          qr_token: string;
          name: string;
          description: string | null;
          category_id: string | null;
          location_id: string | null;
          storage_spot_id: string | null;
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
          qr_token?: string;
          name: string;
          description?: string | null;
          category_id?: string | null;
          location_id?: string | null;
          storage_spot_id?: string | null;
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
          qr_token?: string;
          name?: string;
          description?: string | null;
          category_id?: string | null;
          location_id?: string | null;
          storage_spot_id?: string | null;
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
            foreignKeyName: 'items_storage_spot_same_household_fkey';
            columns: ['storage_spot_id', 'household_id'];
            isOneToOne: false;
            referencedRelation: 'storage_spots';
            referencedColumns: ['id', 'household_id'];
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
      borrow_records: {
        Row: {
          id: string;
          item_id: string;
          household_id: string;
          borrowed_by: string;
          borrowed_at: string;
          returned_at: string | null;
          due_at: string | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          household_id: string;
          borrowed_by: string;
          borrowed_at?: string;
          returned_at?: string | null;
          due_at?: string | null;
          note?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          household_id?: string;
          borrowed_by?: string;
          borrowed_at?: string;
          returned_at?: string | null;
          due_at?: string | null;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'borrow_records_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'borrow_records_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'borrow_records_borrowed_by_fkey';
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
      notifications: {
        Row: {
          id: string;
          user_id: string;
          household_id: string;
          item_id: string | null;
          notification_type:
            | 'return_due_soon'
            | 'return_overdue'
            | 'item_returned'
            | 'item_updated'
            | 'household_activity';
          title: string;
          body: string | null;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id: string;
          item_id?: string | null;
          notification_type:
            | 'return_due_soon'
            | 'return_overdue'
            | 'item_returned'
            | 'item_updated'
            | 'household_activity';
          title: string;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          household_id?: string;
          item_id?: string | null;
          notification_type?:
            | 'return_due_soon'
            | 'return_overdue'
            | 'item_returned'
            | 'item_updated'
            | 'household_activity';
          title?: string;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          due_soon_enabled: boolean;
          overdue_enabled: boolean;
          returns_enabled: boolean;
          item_updates_enabled: boolean;
          household_activity_enabled: boolean;
          weekly_summary_enabled: boolean;
          pause_all: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          due_soon_enabled?: boolean;
          overdue_enabled?: boolean;
          returns_enabled?: boolean;
          item_updates_enabled?: boolean;
          household_activity_enabled?: boolean;
          weekly_summary_enabled?: boolean;
          pause_all?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          due_soon_enabled?: boolean;
          overdue_enabled?: boolean;
          returns_enabled?: boolean;
          item_updates_enabled?: boolean;
          household_activity_enabled?: boolean;
          weekly_summary_enabled?: boolean;
          pause_all?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
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
          action:
            | 'created'
            | 'updated'
            | 'moved'
            | 'status_changed'
            | 'attachment_added'
            | 'attachment_removed';
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          user_id: string;
          action:
            | 'created'
            | 'updated'
            | 'moved'
            | 'status_changed'
            | 'attachment_added'
            | 'attachment_removed';
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          user_id?: string;
          action?:
            | 'created'
            | 'updated'
            | 'moved'
            | 'status_changed'
            | 'attachment_added'
            | 'attachment_removed';
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
