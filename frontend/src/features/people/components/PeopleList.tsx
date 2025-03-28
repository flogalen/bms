"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation"; // Import useRouter
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Person, PersonStatus, StatusFilterType } from "@/features/people/types";
import { AddPersonForm } from "@/features/people/components/AddPersonForm";
import { EditPersonForm } from "@/features/people/components/EditPersonForm";

// Props for the PeopleList component
interface PeopleListProps {
  className?: string;
}

export function PeopleList({ className }: PeopleListProps) {
  const { data: session } = useSession();
  const router = useRouter(); // Initialize useRouter
  
  // State for people data
  const [people, setPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for filtering and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");
  const [sortField, setSortField] = useState<keyof Person>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPeople, setTotalPeople] = useState(0);
  const itemsPerPage = 10;
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Function to refresh the people list
  const refreshPeople = () => {
    setIsLoading(true);
    fetchPeople();
  };

  // Fetch people data from the API
  const fetchPeople = async () => {
    setIsLoading(true);
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", itemsPerPage.toString());
      
      if (statusFilter !== "ALL" && statusFilter !== "BUSINESS" && statusFilter !== "PERSONAL") {
        queryParams.append("status", statusFilter);
      } else if (statusFilter === "BUSINESS" || statusFilter === "PERSONAL") {
        queryParams.append("category", statusFilter);
      }
      
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }

      // Add Authorization header if session exists
      const headers: HeadersInit = {};
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }
      
      const response = await fetch(`/api/people?${queryParams.toString()}`, { headers });
      
      if (!response.ok) {
        let errorMessage = "Failed to fetch people";
        
        try {
          const errorData = await response.json();
          if (errorData && typeof errorData === 'object' && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in again.");
        } else {
          throw new Error(errorMessage);
        }
      }
      
      const data = await response.json();
      
      if (!data.people || !Array.isArray(data.people)) {
        throw new Error("Invalid data format received from server");
      }
      
      setPeople(data.people);
      setTotalPeople(data.total || data.people.length);
      setTotalPages(Math.ceil((data.total || data.people.length) / itemsPerPage));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      console.error("Error fetching people:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch people on component mount and when filters change
  useEffect(() => {
    if (session?.accessToken) {
      fetchPeople();
    }
  }, [currentPage, statusFilter, searchQuery, session?.accessToken]);

  // TODO: Sorting should be handled by the backend API via query parameters for correct pagination.
  // This current implementation only sorts the data on the current page.
  // Apply client-side sorting (temporary)
  useEffect(() => {
    if (people && people.length > 0) {
      const sorted = [...people].sort((a, b) => {
        const aValue = a[sortField] || "";
        const bValue = b[sortField] || "";
        
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc" 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        // Fallback for non-string values
        return sortDirection === "asc" 
          ? (aValue > bValue ? 1 : -1)
          : (bValue > aValue ? 1 : -1);
      });
      
      setFilteredPeople(sorted);
    } else {
      // If no people data, set filtered people to empty array
      setFilteredPeople([]);
    }
  }, [people, sortField, sortDirection]);

  // Handle sorting change
  const handleSort = (field: keyof Person) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: StatusFilterType) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get status badge color
  const getStatusColor = (status: PersonStatus) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800";
      case "LEAD":
        return "bg-blue-100 text-blue-800";
      case "CUSTOMER":
        return "bg-purple-100 text-purple-800";
      case "VENDOR":
        return "bg-yellow-100 text-yellow-800";
      case "PARTNER":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>People</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search people..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full sm:w-64"
            />
            <div className="flex flex-wrap gap-1 items-center">
              <Button 
                variant={statusFilter === "ALL" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleStatusFilterChange("ALL")}
              >
                All
              </Button>
              <Button 
                variant={statusFilter === "BUSINESS" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleStatusFilterChange("BUSINESS")}
              >
                Business
              </Button>
              <Button 
                variant={statusFilter === "PERSONAL" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleStatusFilterChange("PERSONAL")}
              >
                Personal
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                Add Person
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : filteredPeople.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No people found</div>
        ) : (
          <>
            {/* Responsive table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th 
                      className="py-3 px-4 text-left cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortField === "name" && (
                          <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 text-left cursor-pointer hover:bg-gray-50 hidden md:table-cell"
                      onClick={() => handleSort("company")}
                    >
                      <div className="flex items-center gap-1">
                        Company
                        {sortField === "company" && (
                          <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 text-left cursor-pointer hover:bg-gray-50 hidden lg:table-cell"
                      onClick={() => handleSort("role")}
                    >
                      <div className="flex items-center gap-1">
                        Role
                        {sortField === "role" && (
                          <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 text-left cursor-pointer hover:bg-gray-50 hidden sm:table-cell"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === "status" && (
                          <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 text-left hidden md:table-cell"
                      onClick={() => handleSort("lastInteraction")}
                    >
                      <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-50">
                        Last Interaction
                        {sortField === "lastInteraction" && (
                          <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 text-left"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person) => (
                    <tr 
                      key={person.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        router.push(`/people/${person.id}`); // Use router.push for navigation
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium">{person.name}</div>
                        <div className="text-sm text-gray-500 md:hidden">{person.company || "-"}</div>
                        <div className="text-xs text-gray-500 sm:hidden">
                          <span className={`px-2 py-1 rounded-full ${getStatusColor(person.status)}`}>
                            {person.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">{person.company || "-"}</td>
                      <td className="py-3 px-4 hidden lg:table-cell">{person.role || "-"}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(person.status)}`}>
                          {person.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {person.lastInteraction ? new Date(person.lastInteraction).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="hidden sm:inline-flex"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/people/${person.id}`); // Use router.push
                            }}
                          >
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="sm:hidden h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/people/${person.id}`); // Use router.push
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="hidden sm:inline-flex"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPersonId(person.id);
                              setEditDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="sm:hidden h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPersonId(person.id);
                              setEditDialogOpen(true);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalPeople)} of {totalPeople} people
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  // Show pages around current page
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i;
                  }
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      {/* Edit Person Dialog */}
      {selectedPersonId && (
        <EditPersonForm
          personId={selectedPersonId}
          isOpen={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onPersonUpdated={refreshPeople}
        />
      )}
      
      {/* Add Person Dialog */}
      <AddPersonForm
        isOpen={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onPersonAdded={refreshPeople}
      />
    </Card>
  );
}
