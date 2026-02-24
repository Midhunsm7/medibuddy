import { supabase } from './supabase/supabase';

// Custom authentication functions (for testing only!)

export interface CustomUser {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  created_at: string;
}

export interface CustomSession {
  user: CustomUser;
  token: string;
  expires_at: string;
}

// Generate a simple session token
const generateToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Sign up a new user
export const customSignUp = async (
  email: string,
  password: string,
  fullName?: string,
  phone?: string
): Promise<{ user: CustomUser | null; error: Error | null }> => {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('custom_users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return {
        user: null,
        error: new Error('User with this email already exists')
      };
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from('custom_users')
      .insert({
        email,
        password, // Plain text for testing only!
        full_name: fullName,
        phone
      })
      .select()
      .single();

    if (error) throw error;

    return { user: newUser, error: null };
  } catch (error: any) {
    return { user: null, error };
  }
};

// Sign in a user
export const customSignIn = async (
  email: string,
  password: string
): Promise<{ session: CustomSession | null; error: Error | null }> => {
  try {
    // Find user with matching email and password
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !user) {
      return {
        session: null,
        error: new Error('Invalid email or password')
      };
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { error: sessionError } = await supabase
      .from('custom_sessions')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString()
      });

    if (sessionError) throw sessionError;

    // Store session in localStorage and cookies
    const session: CustomSession = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        created_at: user.created_at
      },
      token,
      expires_at: expiresAt.toISOString()
    };

    if (typeof window !== 'undefined') {
      const sessionStr = JSON.stringify(session);
      localStorage.setItem('custom_session', sessionStr);
      
      // Set cookie with proper mobile-compatible settings
      const isProduction = window.location.protocol === 'https:';
      const cookieOptions = [
        `custom_session=${encodeURIComponent(sessionStr)}`,
        'path=/',
        `max-age=${7 * 24 * 60 * 60}`,
        'SameSite=None', // Changed from Lax to None for mobile compatibility
        isProduction ? 'Secure' : '' // Secure flag required with SameSite=None
      ].filter(Boolean).join('; ');
      
      document.cookie = cookieOptions;
    }

    return { session, error: null };
  } catch (error: any) {
    return { session: null, error };
  }
};

// Sign out
export const customSignOut = async (): Promise<{ error: Error | null }> => {
  try {
    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem('custom_session');
      if (sessionStr) {
        const session: CustomSession = JSON.parse(sessionStr);
        
        // Delete session from database
        await supabase
          .from('custom_sessions')
          .delete()
          .eq('token', session.token);

        // Clear localStorage
        localStorage.removeItem('custom_session');
        
        // Clear cookie
        document.cookie = 'custom_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
    return { error: null };
  } catch (error: any) {
    return { error };
  }
};

// Get current session
export const getCustomSession = (): CustomSession | null => {
  if (typeof window === 'undefined') return null;
  
  const sessionStr = localStorage.getItem('custom_session');
  if (!sessionStr) return null;

  try {
    const session: CustomSession = JSON.parse(sessionStr);
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      localStorage.removeItem('custom_session');
      return null;
    }

    return session;
  } catch {
    return null;
  }
};

// Get current user
export const getCurrentCustomUser = (): CustomUser | null => {
  const session = getCustomSession();
  return session?.user || null;
};

// Check if user is authenticated
export const isCustomAuthenticated = (): boolean => {
  return getCustomSession() !== null;
};

// Made with Bob
