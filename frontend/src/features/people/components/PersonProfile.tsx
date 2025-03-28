"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { EditPersonForm } from "@/features/people/components/EditPersonForm";
import { InteractionForm } from "@/features/people/components/InteractionForm";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Person, PersonStatus, DynamicField } from "@/features/people/types";
import { toast } from "sonner";

interface PersonProfileProps {
  personId: string;
  initialPersonData?: Person;
  className?: string;
  onPersonUpdated?: () => void;
}

interface Interaction {
  id: string;
  type: string;
  notes?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  personId: string;
  createdById?: string | null;
  structuredTags?: {
    id: string;
    name: string;
    color: string;
    description?: string;
  }[];
}

export function PersonProfile({ personId, initialPersonData, className, onPersonUpdated }: PersonProfileProps) {
  const { data: session } = useSession();
  
  // State for person data
  const [person, setPerson] = useState<Person | null>(initialPersonData || null);
  const [isLoading, setIsLoading] = useState(!initialPersonData);
  const [error, setError] = useState<string | null>(null);
  
  // State for interactions
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(true);
  
  // State for edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // State for interaction dialog
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  
  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for notes editing
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editableNotes, setEditableNotes] = useState<string>("");

  // Initialize notes from person data
  useEffect(() => {
    if (person) {
      setEditableNotes(person.notes || "");
    } else if (initialPersonData) {
      setEditableNotes(initialPersonData.notes || "");
    }
  }, [person, initialPersonData]);

  // Fetch person data if not provided initially or needs refresh
  const fetchPerson = async () => {
    setIsLoading(true);
    try {
      // Use the session to get the authentication token
      if (!session?.accessToken) {
        console.error("No session available for authentication");
        setError("Authentication required");
        setIsLoading(false);
        return;
      }
      
      // Make direct request to backend API using the ID
      const response = await fetch(`/api/people/${personId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
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
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setPerson(data);
      
      // Set editable notes
      setEditableNotes(data.notes || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      console.error("Error fetching person:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch interactions for this person
  const fetchInteractions = async () => {
    setIsLoadingInteractions(true);
    try {
      // Use the session to get the authentication token
      if (!session?.accessToken) {
        console.error("No session available for authentication");
        return;
      }
      
      // Make request to frontend API route
      const response = await fetch(`/api/interactions?personId=${personId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        console.error("Failed to fetch interactions:", response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log("Fetched interactions:", data); // Debug log
      
      // Check if data.data exists (from backend response structure)
      if (data.data) {
        setInteractions(data.data || []);
      } else {
        setInteractions(data.interactions || []);
      }
    } catch (err) {
      console.error("Error fetching interactions:", err);
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    if (personId && session) {
      // Only fetch person data if not provided initially
      if (!initialPersonData) {
        fetchPerson();
      }
      fetchInteractions();
    }
  }, [personId, session, initialPersonData]);

  // Handle saving notes
  const handleSaveNotes = async () => {
    try {
      if (!person) {
        throw new Error("Person data not available");
      }
      
      // Make request to frontend API route
      const response = await fetch(`/api/people/${personId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: editableNotes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update notes");
      }

      // Success
      const updatedPerson = await response.json();
      setPerson(updatedPerson);
      toast.success("Notes updated successfully");
      
      // Exit editing mode
      setIsEditingNotes(false);
      
      // Notify parent component
      if (onPersonUpdated) {
        onPersonUpdated();
      }
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update notes");
    }
  };

  // Handle person deletion
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      if (!person) {
        throw new Error("Person data not available");
      }
      
      // Make request to frontend API route
      const response = await fetch(`/api/people/${personId}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete person");
      }

      // Success
      toast.success("Person deleted successfully");
      
      // Close dialog
      setIsDeleteDialogOpen(false);
      
      // Notify parent component
      if (onPersonUpdated) {
        onPersonUpdated();
      }
      
      // Redirect to people list
      window.location.href = "/people";
    } catch (error) {
      console.error("Error deleting person:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete person");
    } finally {
      setIsDeleting(false);
    }
  };

  // Get status badge color
  const getStatusColor = (status: PersonStatus) => {
    switch (status) {
      // Business contacts
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
      
      // Personal contacts
      case "FRIEND":
        return "bg-pink-100 text-pink-800";
      case "FAMILY":
        return "bg-red-100 text-red-800";
      case "ACQUAINTANCE":
        return "bg-orange-100 text-orange-800";
      
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format date for display
  const formatDate = (dateString: string, includeTime: boolean = true) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime ? {
        hour: '2-digit',
        minute: '2-digit'
      } : {})
    }).format(date);
  };

  // Get interaction type badge color
  const getInteractionTypeColor = (type: string) => {
    switch (type) {
      case "CALL":
        return "bg-blue-100 text-blue-800";
      case "EMAIL":
        return "bg-purple-100 text-purple-800";
      case "MEETING":
        return "bg-green-100 text-green-800";
      case "NOTE":
        return "bg-yellow-100 text-yellow-800";
      case "TASK":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !person) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8 text-red-500">
          {error || "Person not found"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header Card with Core Information */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 text-lg">
                {getInitials(person.name)}
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{person.name}</CardTitle>
                <CardDescription>
                  {person.role && person.company 
                    ? `${person.role} @ ${person.company}`
                    : person.role 
                      ? person.role
                      : person.company
                        ? `@ ${person.company}`
                        : "No role or company specified"}
                </CardDescription>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(person.status)}`}>
                    {person.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(true)}
              >
                Edit
              </Button>
              
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p>Are you sure you want to delete {person.name}? This action cannot be undone.</p>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Select
                value={person.status}
                onValueChange={(value: string) => {
                  // Quick status change
                  const newStatus = value as PersonStatus;
      
      fetch(`/api/people/${personId}`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status: newStatus }),
                  })
                    .then(response => {
                      if (!response.ok) throw new Error("Failed to update status");
                      return response.json();
                    })
                    .then(updatedPerson => {
                      setPerson(updatedPerson);
                      toast.success(`Status updated to ${newStatus}`);
                      if (onPersonUpdated) onPersonUpdated();
                    })
                    .catch(error => {
                      console.error("Error updating status:", error);
                      toast.error("Failed to update status");
                    });
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business-header" disabled className="font-semibold">Business Contacts</SelectItem>
                  <SelectItem value={PersonStatus.LEAD}>Lead</SelectItem>
                  <SelectItem value={PersonStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={PersonStatus.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={PersonStatus.CUSTOMER}>Customer</SelectItem>
                  <SelectItem value={PersonStatus.VENDOR}>Vendor</SelectItem>
                  <SelectItem value={PersonStatus.PARTNER}>Partner</SelectItem>
                  <SelectItem value="personal-header" disabled className="font-semibold">Personal Contacts</SelectItem>
                  <SelectItem value={PersonStatus.FRIEND}>Friend</SelectItem>
                  <SelectItem value={PersonStatus.FAMILY}>Family</SelectItem>
                  <SelectItem value={PersonStatus.ACQUAINTANCE}>Acquaintance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
              <div className="mt-2 space-y-2">
                <div>
                  <span className="text-sm font-medium">Email:</span>{" "}
                  <span className="text-sm">{person.email || "Not provided"}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Phone:</span>{" "}
                  <span className="text-sm">{person.phone || "Not provided"}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Address:</span>{" "}
                  <span className="text-sm">{person.address || "Not provided"}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Additional Information</h3>
              <div className="mt-2 space-y-2">
                <div>
                  <span className="text-sm font-medium">Created:</span>{" "}
                  <span className="text-sm">{formatDate(person.createdAt)}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Last Updated:</span>{" "}
                  <span className="text-sm">{formatDate(person.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Person Dialog */}
      {person && (
        <EditPersonForm
          personId={personId}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onPersonUpdated={() => {
            fetchPerson();
            if (onPersonUpdated) onPersonUpdated();
          }}
        />
      )}
      
      {/* Add Interaction Dialog */}
      {person && (
        <InteractionForm
          personId={personId}
          isOpen={isInteractionDialogOpen}
          onOpenChange={setIsInteractionDialogOpen}
          onInteractionCreated={() => {
            // Force immediate refresh of interactions
            setIsLoadingInteractions(true);
            // Immediately fetch fresh data without delay
            fetch(`/api/interactions?personId=${personId}&_=${new Date().getTime()}`, {
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              },
              cache: 'no-store',
            })
              .then(response => {
                if (!response.ok) {
                  throw new Error("Failed to fetch interactions");
                }
                return response.json();
              })
              .then(data => {
                console.log("Refreshed interactions:", data);
                if (data.data) {
                  setInteractions(data.data);
                } else {
                  setInteractions(data.interactions || []);
                }
                setIsLoadingInteractions(false);
              })
              .catch(err => {
                console.error("Error refreshing interactions:", err);
                setIsLoadingInteractions(false);
              });
          }}
        />
      )}

      {/* Tabs for Additional Details */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
        </TabsList>
        
        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Notes Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">Notes</h3>
                    {!isEditingNotes && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingNotes(true)}
                      >
                        Edit Notes
                      </Button>
                    )}
                  </div>
                  
                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <Textarea 
                        value={editableNotes || ""}
                        onChange={(e) => setEditableNotes(e.target.value)}
                        className="min-h-[100px]"
                        placeholder="Add notes here..."
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingNotes(false);
                            setEditableNotes(person.notes || "");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveNotes}
                        >
                          Save Notes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-md">
                      {person.notes ? (
                        <p className="whitespace-pre-wrap">{person.notes}</p>
                      ) : (
                        <p className="text-gray-500 italic">No notes available</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Dynamic Fields Section */}
                {person.dynamicFields && person.dynamicFields.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Custom Fields</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {person.dynamicFields.map((field: DynamicField) => (
                        <div key={field.id} className="bg-gray-50 p-4 rounded-md">
                          <h4 className="font-medium">{field.fieldName}</h4>
                          <p>
                            {field.fieldType === "STRING" && field.stringValue}
                            {field.fieldType === "NUMBER" && field.numberValue}
                            {field.fieldType === "BOOLEAN" && (field.booleanValue ? "Yes" : "No")}
                            {field.fieldType === "DATE" && field.dateValue && formatDate(field.dateValue, false)}
                            {field.fieldType === "URL" && field.stringValue && (
                              <a 
                                href={field.stringValue} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {field.stringValue}
                              </a>
                            )}
                            {field.fieldType === "EMAIL" && field.stringValue && (
                              <a 
                                href={`mailto:${field.stringValue}`}
                                className="text-blue-600 hover:underline"
                              >
                                {field.stringValue}
                              </a>
                            )}
                            {field.fieldType === "PHONE" && field.stringValue && (
                              <a 
                                href={`tel:${field.stringValue}`}
                                className="text-blue-600 hover:underline"
                              >
                                {field.stringValue}
                              </a>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Interactions Tab */}
        <TabsContent value="interactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Interaction History</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsLoadingInteractions(true);
                    fetch(`/api/interactions?personId=${personId}&_=${new Date().getTime()}`, {
                      headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                      },
                      cache: 'no-store',
                    })
                      .then(response => {
                        if (!response.ok) {
                          throw new Error("Failed to fetch interactions");
                        }
                        return response.json();
                      })
                      .then(data => {
                        if (data.data) {
                          setInteractions(data.data);
                        } else {
                          setInteractions(data.interactions || []);
                        }
                        setIsLoadingInteractions(false);
                        toast.success("Interactions refreshed");
                      })
                      .catch(err => {
                        console.error("Error refreshing interactions:", err);
                        setIsLoadingInteractions(false);
                        toast.error("Failed to refresh interactions");
                      });
                  }}
                >
                  Refresh
                </Button>
                <Button onClick={() => setIsInteractionDialogOpen(true)}>Add Interaction</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingInteractions ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : interactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No interactions recorded</div>
              ) : (
                <div className="space-y-4">
                  {interactions.map((interaction) => (
                    <div key={interaction.id} className="border rounded-md p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <div className="flex items-center gap-2 mb-2 sm:mb-0">
                          <span className={`px-2 py-1 rounded-full text-xs ${getInteractionTypeColor(interaction.type)}`}>
                            {interaction.type}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(interaction.date)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {interaction.structuredTags?.map(tag => (
                            <span 
                              key={tag.id}
                              className="px-2 py-1 rounded-full text-xs"
                              style={{ 
                                backgroundColor: `${tag.color}20`, // 20% opacity
                                color: tag.color 
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      {interaction.notes && (
                        <p className="text-sm whitespace-pre-wrap">{interaction.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
