/**
 * Database Types for Supabase
 * 
 * This file contains TypeScript types for the Supabase database schema.
 * These types are used for type-safe database operations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          oauth_provider: 'google' | 'apple' | 'microsoft'
          oauth_provider_id: string
          email: string
          name: string
          profile_picture: string | null
          role: 'buyer' | 'seller' | 'admin'
          location: Json | null
          created_at: string
          updated_at: string
          is_active: boolean
          rating: number | null
          total_transactions: number
          suspended_until: string | null
          listing_limit: number | null
          eco_impact: Json | null
        }
        Insert: {
          id?: string
          oauth_provider: 'google' | 'apple' | 'microsoft'
          oauth_provider_id: string
          email: string
          name: string
          profile_picture?: string | null
          role?: 'buyer' | 'seller' | 'admin'
          location?: Json | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
          rating?: number | null
          total_transactions?: number
          suspended_until?: string | null
          listing_limit?: number | null
          eco_impact?: Json | null
        }
        Update: {
          id?: string
          oauth_provider?: 'google' | 'apple' | 'microsoft'
          oauth_provider_id?: string
          email?: string
          name?: string
          profile_picture?: string | null
          role?: 'buyer' | 'seller' | 'admin'
          location?: Json | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
          rating?: number | null
          total_transactions?: number
          suspended_until?: string | null
          listing_limit?: number | null
          eco_impact?: Json | null
        }
      }
      books: {
        Row: {
          id: string
          isbn: string | null
          title: string
          author: string
          publisher: string | null
          edition: string | null
          publication_year: number | null
          category_id: string
          subject: string | null
          description: string | null
          cover_image: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          isbn?: string | null
          title: string
          author: string
          publisher?: string | null
          edition?: string | null
          publication_year?: number | null
          category_id: string
          subject?: string | null
          description?: string | null
          cover_image?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          isbn?: string | null
          title?: string
          author?: string
          publisher?: string | null
          edition?: string | null
          publication_year?: number | null
          category_id?: string
          subject?: string | null
          description?: string | null
          cover_image?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          type: 'school' | 'competitive_exam' | 'college' | 'general'
          parent_id: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'school' | 'competitive_exam' | 'college' | 'general'
          parent_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'school' | 'competitive_exam' | 'college' | 'general'
          parent_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          book_id: string
          seller_id: string
          original_price: number
          condition_score: number
          condition_details: Json | null
          suggested_price: number | null
          final_price: number
          delivery_cost: number
          platform_commission: number
          payment_fees: number
          seller_payout: number
          status: 'pending_approval' | 'active' | 'sold' | 'rejected' | 'rescan_required' | 'inactive'
          rejection_reason: string | null
          images: string[]
          location: Json | null
          created_at: string
          updated_at: string
          approved_at: string | null
          approved_by: string | null
          views: number
          is_featured: boolean
        }
        Insert: {
          id?: string
          book_id: string
          seller_id: string
          original_price: number
          condition_score: number
          condition_details?: Json | null
          suggested_price?: number | null
          final_price: number
          delivery_cost: number
          platform_commission: number
          payment_fees: number
          seller_payout: number
          status?: 'pending_approval' | 'active' | 'sold' | 'rejected' | 'rescan_required' | 'inactive'
          rejection_reason?: string | null
          images: string[]
          location?: Json | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
          views?: number
          is_featured?: boolean
        }
        Update: {
          id?: string
          book_id?: string
          seller_id?: string
          original_price?: number
          condition_score?: number
          condition_details?: Json | null
          suggested_price?: number | null
          final_price?: number
          delivery_cost?: number
          platform_commission?: number
          payment_fees?: number
          seller_payout?: number
          status?: 'pending_approval' | 'active' | 'sold' | 'rejected' | 'rescan_required' | 'inactive'
          rejection_reason?: string | null
          images?: string[]
          location?: Json | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
          views?: number
          is_featured?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
