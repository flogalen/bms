import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Backend API URL - in a real app, this would come from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get the params - await the params object
    const params = await context.params;
    const tagId = params.id;
    
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
    
    // Get the request body
    const updateData = await request.json();
    
    console.log(`Updating tag ${tagId} with data:`, updateData);
    
    // Make request to backend API
    const response = await fetch(`${API_URL}/api/tags/${tagId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify(updateData),
      cache: 'no-store',
    });
    
    const responseText = await response.text();
    console.log(`Update tag response (${response.status}):`, responseText);
    
    if (!response.ok) {
      let errorMessage = "Failed to update tag";
      
      try {
        const errorData = JSON.parse(responseText);
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
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error("Error parsing success response:", error);
      data = { success: true };
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get the params - await the params object
    const params = await context.params;
    const tagId = params.id;
    
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
    const response = await fetch(`${API_URL}/api/tags/${tagId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      let errorMessage = "Failed to delete tag";
      
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
    
    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
