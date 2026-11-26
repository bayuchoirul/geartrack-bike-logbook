// public/js/types/external.d.ts
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export interface SupabaseClient {
    auth: {
      getSession(): Promise<{ data: { session: any }; error: any }>;
      signInWithPassword(credentials: { email: string; password: string }): Promise<{ data: any; error: any }>;
      signUp(credentials: { email: string; password: string; options?: any }): Promise<{ data: any; error: any }>;
      resetPasswordForEmail(email: string, options?: any): Promise<{ data?: any; error: any }>;
      signOut(): Promise<{ error: any }>;
    };
    from(table: string): any;
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, any>
  ): SupabaseClient;
}
