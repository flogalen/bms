import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Backend API URL - in a real app, this would come from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  props: { params: { id: string } }
) {
  try {
    // Get the ID from params
    const params = await props.params;
    const id = params.id;
    
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
    
    // Make direct request to backend API using the ID
    const response = await fetch(`${API_URL}/api/people/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Disable caching to ensure we always get fresh data
      cache: 'no-store',
    });
    
    if (!response.ok) {
      let errorMessage = "Failed to fetch person";
      
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
    
    // Return the person data directly
    const person = await response.json();
    return NextResponse.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person data' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: { id: string } }
) {
  try {
    // Get the ID from params
    const params = await props.params;
    const id = params.id;
    
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
    
    // Make request to backend API
    const updateResponse = await fetch(`${API_URL}/api/people/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!updateResponse.ok) {
      let errorMessage = "Failed to update person";
      
      try {
        const errorData = await updateResponse.json();
        if (errorData && typeof errorData === 'object' && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: updateResponse.status }
      );
    }
    
    // Return the backend response
    const updatedData = await updateResponse.json();
    return NextResponse.json(updatedData);
  } catch (error) {
    console.error('Error updating person:', error);
    return NextResponse.json(
      { error: 'Failed to update person' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: { id: string } }
) {
  try {
    // Get the ID from params
    const params = await props.params;
    const id = params.id;
    
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
    const deleteResponse = await fetch(`${API_URL}/api/people/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!deleteResponse.ok) {
      let errorMessage = "Failed to delete person";
      
      try {
        const errorData = await deleteResponse.json();
        if (errorData && typeof errorData === 'object' && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: deleteResponse.status }
      );
    }
    
    // Return the backend response
    const deletedData = await deleteResponse.json();
    return NextResponse.json(deletedData);
  } catch (error) {
    console.error('Error deleting person:', error);
    return NextResponse.json(
      { error: 'Failed to delete person' },
      { status: 500 }
    );
  }
}
