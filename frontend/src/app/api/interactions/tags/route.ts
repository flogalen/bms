import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Backend API URL - in a real app, this would come from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Get the auth token from NextAuth session
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
    
    // Make request to backend API
    const response = await fetch(`${API_URL}/api/interactions/tags`, {
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
      let errorMessage = "Failed to fetch tags";
      
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
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags data' },
      { status: 500 }
    );
  }
}
