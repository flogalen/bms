import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PersonProfile } from "@/features/people/components/PersonProfile";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// Backend API URL - in a real app, this would come from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Generate metadata for the page
export async function generateMetadata(): Promise<Metadata> {
  // Default metadata for person details
  return {
    title: `Person Details | Business Management System`,
    description: "View and manage person details",
  };
}

// This is a server component
export default async function PersonPage(
  props: { params: { id: string } }
) {
  // Get the ID from params
  const params = await props.params;
  const id = params.id;
  
  try {
    // Get the session to access the authentication token
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      // Redirect to login if not authenticated
      redirect('/login?callbackUrl=' + encodeURIComponent(`/people/${id}`));
    }
    
    // Make direct request to backend API using the ID
    const response = await fetch(`${API_URL}/api/people/${id}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Disable caching to ensure we always get fresh data
    });
    
    if (!response.ok) {
      console.error(`Error fetching person: ${response.status} ${response.statusText}`);
      notFound();
    }
    
    const person = await response.json();
    
    return (
      <DashboardShell>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Person Profile</h1>
          <div className="flex items-center gap-2">
            <Link href="/people">
              <Button variant="outline">Back to People</Button>
            </Link>
          </div>
        </div>
        
        <PersonProfile personId={person.id} initialPersonData={person} />
      </DashboardShell>
    );
  } catch (error) {
    console.error("Error in PersonPage:", error);
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Error Loading Person</h1>
          <p className="text-gray-500 mb-6">There was an error loading the person details.</p>
          <Link href="/people">
            <Button>Back to People List</Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }
}
