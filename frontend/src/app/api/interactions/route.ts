import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Backend API URL - in a real app, this would come from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  // TODO: Refactor common logic (getToken, auth check, fetch, error handling) into a helper function
  try {
    // Get the auth token from NextAuth session
    // !!! SECURITY WARNING: Ensure NEXTAUTH_SECRET environment variable is set and matches the one in authOptions!
    const session = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const token = session.accessToken;
    
    // Forward the query parameters to the backend
    const queryString = request.nextUrl.search;
    
    // Make request to backend API
    const response = await fetch(`${API_URL}/api/interactions${queryString}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      // Disable caching to ensure we always get fresh data
      cache: 'no-store',
    });
    
    if (!response.ok) {
      let errorMessage = "Failed to fetch interactions";
      
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }
    
    // Return the backend response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interactions data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // TODO: Refactor common logic (getToken, auth check, fetch, error handling) into a helper function
  try {
    // Get the auth token from NextAuth session
    // !!! SECURITY WARNING: Ensure NEXTAUTH_SECRET environment variable is set and matches the one in authOptions!
    const session = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const token = session.accessToken;
    
    // Get the request body
    const interactionData = await request.json();
    
    // Make request to backend API
    const response = await fetch(`${API_URL}/api/interactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(interactionData),
    });
    
    if (!response.ok) {
      let errorMessage = "Failed to create interaction";
      
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }
    
    // Return the backend response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating interaction:', error);
    return NextResponse.json(
      { error: 'Failed to create interaction' },
      { status: 500 }
    );
  }
}
