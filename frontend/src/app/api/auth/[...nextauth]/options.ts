import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Extend the built-in types
declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    token: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    accessToken: string;
  }
}

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Make a call to the backend API
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
          
          const data = await response.json();
          
          if (response.ok && data) {
            // Store the JWT token in the user object
            return {
              id: data.id,
              name: data.name,
              email: data.email,
              role: data.role,
              token: data.token, // Store the JWT token
            };
          }
          
          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  events: {
    async signOut({ token }) {
      // Call the backend logout endpoint
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token?.accessToken}` 
          },
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    },
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.token; // Store the JWT token in the token
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.accessToken = token.accessToken as string; // Make the token available in the session
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // !!! SECURITY WARNING: Ensure NEXTAUTH_SECRET environment variable is set to a strong, unique secret in production!
  // This is used to sign the NextAuth session JWT. Generate one using `openssl rand -base64 32` or similar.
  secret: process.env.NEXTAUTH_SECRET || "your-default-nextauth-secret",
};

export default authOptions;
