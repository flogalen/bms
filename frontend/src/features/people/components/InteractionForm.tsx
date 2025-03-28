"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// Removed unused import
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Define the interaction types from the backend schema
enum InteractionType {
  CALL = "CALL",
  EMAIL = "EMAIL",
  MEETING = "MEETING",
  NOTE = "NOTE",
  TASK = "TASK",
  OTHER = "OTHER"
}

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface InteractionFormProps {
  personId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInteractionCreated?: () => void;
}

// Predefined colors for tags
const TAG_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#6366F1", // indigo
  "#F97316", // orange
];

export function InteractionForm({ 
  personId, 
  isOpen, 
  onOpenChange, 
  onInteractionCreated 
}: InteractionFormProps) {
  const { data: session } = useSession();
  
  // Form state
  const [type, setType] = useState<InteractionType>(InteractionType.NOTE);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(
    new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  
  // Tags state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [topTags, setTopTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isLoadingTopTags, setIsLoadingTopTags] = useState(true);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedTagForColorEdit, setSelectedTagForColorEdit] = useState<Tag | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Refs for handling click outside and keyboard navigation
  const tagInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<number>(-1);

  // Handle clicks outside the suggestions dropdown and keyboard navigation
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        tagInputRef.current && 
        !tagInputRef.current.contains(event.target as Node)
      ) {
        setShowTagSuggestions(false);
      }
      
      // Close color picker when clicking outside
      if (selectedTagForColorEdit && 
          event.target instanceof Element && 
          !event.target.closest('.color-picker-container')) {
        setSelectedTagForColorEdit(null);
        setSelectedColor("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Close color picker when pressing Escape
      if (event.key === 'Escape' && selectedTagForColorEdit) {
        setSelectedTagForColorEdit(null);
        setSelectedColor("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTagForColorEdit]);

  // Reset focused suggestion index when filtered tags change
  useEffect(() => {
    setFocusedSuggestionIndex(-1);
  }, [filteredTags]);

  // Fetch all tags when the component mounts
  useEffect(() => {
    if (session && isOpen) {
      fetchTags();
      fetchTopTags();
    }
  }, [session, isOpen]);

  // Fetch top tags from the backend
  const fetchTopTags = async () => {
    setIsLoadingTopTags(true);
    try {
      // Make request to backend API for top tags
      const response = await fetch(`/api/tags/top`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache', // Ensure we get fresh data
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch top tags");
      }
      
      const data = await response.json();
      console.log("Raw API response from top tags:", data);
      
      // Check the structure of the response
      let tags: Tag[] = [];
      if (data.tags) {
        tags = data.tags;
      } else if (data.data) {
        // Handle case where tags might be in data property
        tags = data.data;
      } else if (data.success && data.data) {
        // Handle case where response has success and data properties
        tags = data.data;
      } else if (Array.isArray(data)) {
        // Handle case where response might be an array directly
        tags = data;
      }
      
      console.log("Top tags after parsing:", tags);
      
      setTopTags(tags);
    } catch (error) {
      console.error("Error fetching top tags:", error);
      // Don't show error toast for top tags as it's not critical
    } finally {
      setIsLoadingTopTags(false);
    }
  };

  // Filter tags based on search input and fetch from database if needed
  useEffect(() => {
    const searchTags = async () => {
      console.log("Current allTags state:", allTags);
      console.log("Current selectedTagIds state:", selectedTagIds);
      
      if (tagSearch.trim() === "") {
        setFilteredTags(allTags);
        setShowTagSuggestions(false);
        return;
      }
      
      const searchLower = tagSearch.toLowerCase();
      
      // First, filter the local tags
      const filtered = allTags
        .filter(tag => 
          tag.name.toLowerCase().includes(searchLower) ||
          (tag.description && tag.description.toLowerCase().includes(searchLower))
        )
        .sort((a, b) => {
          const aStartsWith = a.name.toLowerCase().startsWith(searchLower);
          const bStartsWith = b.name.toLowerCase().startsWith(searchLower);
          
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          return a.name.localeCompare(b.name); // Alphabetical for same relevance
        });
      
      setFilteredTags(filtered);
      setShowTagSuggestions(filtered.length > 0);
      
      // We no longer auto-select exact matches, just show them in the dropdown
      
      // If no exact match locally, search in the database
      try {
        // Only search in database if the search term is at least 2 characters
        if (searchLower.length >= 2) {
          console.log("Searching for tags in database:", searchLower);
          const response = await fetch(`/api/tags?search=${encodeURIComponent(searchLower)}`, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            },
          });
          
          if (!response.ok) {
            throw new Error("Failed to search tags");
          }
          
          const data = await response.json();
          console.log("Raw API response from tag search:", data);
          
          // Check the structure of the response
          let dbTags: Tag[] = [];
          if (data.tags) {
            dbTags = data.tags;
          } else if (data.data) {
            // Handle case where tags might be in data property
            dbTags = data.data;
          } else if (data.success && data.data) {
            // Handle case where response has success and data properties
            dbTags = data.data;
          } else if (Array.isArray(data)) {
            // Handle case where response might be an array directly
            dbTags = data;
          }
          
          console.log("Tags found in database after parsing:", dbTags);
          
          // Add any new tags from the database to our local state
          if (dbTags.length > 0) {
            // Filter out tags we already have locally
            const newDbTags = dbTags.filter((dbTag: Tag) => 
              !allTags.some(localTag => localTag.id === dbTag.id)
            );
            
            if (newDbTags.length > 0) {
              console.log("Adding new tags from database:", newDbTags);
              const updatedAllTags = [...allTags, ...newDbTags];
              setAllTags(updatedAllTags);
              
              // Update filtered tags
              const updatedFiltered = updatedAllTags
                .filter(tag => 
                  tag.name.toLowerCase().includes(searchLower) ||
                  (tag.description && tag.description.toLowerCase().includes(searchLower))
                )
                .sort((a, b) => {
                  const aStartsWith = a.name.toLowerCase().startsWith(searchLower);
                  const bStartsWith = b.name.toLowerCase().startsWith(searchLower);
                  
                  if (aStartsWith && !bStartsWith) return -1;
                  if (!aStartsWith && bStartsWith) return 1;
                  return a.name.localeCompare(b.name);
                });
              
              setFilteredTags(updatedFiltered);
              setShowTagSuggestions(updatedFiltered.length > 0);
              
              // We no longer auto-select exact matches from the database either
            }
          }
        }
      } catch (error) {
        console.error("Error searching tags in database:", error);
      }
    };
    
    // Debounce the search to avoid too many requests
    const timeoutId = setTimeout(() => {
      searchTags();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [tagSearch, allTags, selectedTagIds]);

  // Fetch all tags from the backend
  const fetchTags = async () => {
    setIsLoadingTags(true);
    try {
      // Make request to backend API through the interaction controller
      const response = await fetch(`/api/interactions/tags`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache', // Ensure we get fresh data
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }
      
      const data = await response.json();
      console.log("Raw API response from interactions/tags:", data);
      
      // Check the structure of the response
      let tags: Tag[] = [];
      if (data.tags) {
        tags = data.tags;
      } else if (data.data) {
        // Handle case where tags might be in data property
        tags = data.data;
      } else if (data.success && data.data) {
        // Handle case where response has success and data properties
        tags = data.data;
      } else if (Array.isArray(data)) {
        // Handle case where response might be an array directly
        tags = data;
      }
      
      console.log("Tags after parsing:", tags);
      
      setAllTags(tags);
      setFilteredTags(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast.error("Failed to load tags");
    } finally {
      setIsLoadingTags(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors: Record<string, string> = {};
    
    if (!type) {
      validationErrors.type = "Interaction type is required";
    }
    
    if (!date) {
      validationErrors.date = "Date is required";
    }
    
    setErrors(validationErrors);
    
    // If there are validation errors, don't submit
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Combine date and time
      const dateTime = new Date(`${date}T${time}`);
      
      // Create interaction data
      const interactionData = {
        type,
        notes: notes.trim() || null,
        date: dateTime.toISOString(),
        personId,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined
      };
      
      // Submit to API
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interactionData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create interaction");
      }
      
      // Success
      toast.success("Interaction logged successfully");
      
      // Reset form
      setType(InteractionType.NOTE);
      setNotes("");
      setDate(new Date().toISOString().split('T')[0]);
      setTime(
        new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      );
      setSelectedTagIds([]);
      setTagSearch("");
      
      // Close dialog
      onOpenChange(false);
      
      // Notify parent component
      if (onInteractionCreated) {
        onInteractionCreated();
      }
    } catch (error) {
      console.error("Error creating interaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create interaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Select a tag from suggestions
  const selectTagFromSuggestions = (tag: Tag) => {
    if (!selectedTagIds.includes(tag.id)) {
      // Important: Create a new array to trigger state update
      const newSelectedTagIds = [...selectedTagIds, tag.id];
      setSelectedTagIds(newSelectedTagIds);
      toast.success(`Tag "${tag.name}" selected`);
    } else {
      toast.info(`Tag "${tag.name}" already selected`);
    }
    setTagSearch("");
    setShowTagSuggestions(false);
  };

  // Create or find a tag
  const createOrFindTag = async () => {
    if (!tagSearch.trim()) return;
    
    try {
      // First, check if a tag with this name already exists
      const tagName = tagSearch.trim();
      
      // Do a case-insensitive search for existing tag
      const existingTag = allTags.find(tag => 
        tag.name.toLowerCase() === tagName.toLowerCase()
      );
      
      // If tag already exists, just select it
      if (existingTag) {
        console.log("Tag already exists, selecting it:", existingTag);
        if (!selectedTagIds.includes(existingTag.id)) {
          // Important: Create a new array to trigger state update
          const newSelectedTagIds = [...selectedTagIds, existingTag.id];
          setSelectedTagIds(newSelectedTagIds);
          toast.success(`Tag "${existingTag.name}" selected`);
        } else {
          toast.info(`Tag "${existingTag.name}" already selected`);
        }
        setTagSearch("");
        setShowTagSuggestions(false);
        return;
      }
      
      // Generate a random color for the new tag
      const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      
      const tagData = {
        name: tagName,
        color: randomColor
      };
      
      console.log("Creating tag with data:", tagData);
      
      // Submit to API
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tagData),
      });
      
      console.log("Tag creation response status:", response.status);
      
      // If we get a 400 error, it might be because the tag already exists (race condition)
      // In this case, we should try to fetch all tags again
      if (response.status === 400) {
        console.log("Tag creation failed, refreshing tags list");
        
        // Refresh the tags list
        const tagsResponse = await fetch(`/api/interactions/tags`, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });
        
        if (!tagsResponse.ok) {
          throw new Error("Failed to fetch tags after creation error");
        }
        
        const tagsData = await tagsResponse.json();
        const updatedTags = tagsData.tags || [];
        
        // Update the tags list
        setAllTags(updatedTags);
        
        // Try to find the tag again after refreshing
        const refreshedTag = updatedTags.find((tag: Tag) => 
          tag.name.toLowerCase() === tagName.toLowerCase()
        );
        
        if (refreshedTag) {
          console.log("Found tag after refresh:", refreshedTag);
          if (!selectedTagIds.includes(refreshedTag.id)) {
            // Important: Create a new array to trigger state update
            const newSelectedTagIds = [...selectedTagIds, refreshedTag.id];
            setSelectedTagIds(newSelectedTagIds);
            toast.success(`Tag "${refreshedTag.name}" selected`);
          } else {
            toast.info(`Tag "${refreshedTag.name}" already selected`);
          }
          setTagSearch("");
          setShowTagSuggestions(false);
          return;
        }
        
        // If we still can't find it, show an error
        toast.error("Failed to create or find tag");
        return;
      }
      
      // For other errors
      if (!response.ok) {
        const responseText = await response.text();
        console.log("Error response:", responseText);
        
        let errorMessage = "Failed to create tag";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        
        toast.error(errorMessage);
        return;
      }
      
      // Success - parse the response
      const responseText = await response.text();
      console.log("Success response:", responseText);
      
      try {
        const responseData = JSON.parse(responseText);
        console.log("Parsed response data:", responseData);
        
        // Handle different response formats
        let newTag: Tag;
        if (responseData.data) {
          newTag = responseData.data;
        } else if (responseData.success && responseData.data) {
          newTag = responseData.data;
        } else {
          newTag = responseData;
        }
        
        console.log("Extracted tag:", newTag);
        
        // Add to tags list and select it
        setAllTags(prev => [...prev, newTag]);
        
        // Important: Create a new array to trigger state update
        const newSelectedTagIds = [...selectedTagIds, newTag.id];
        setSelectedTagIds(newSelectedTagIds);
        
        setTagSearch("");
        setShowTagSuggestions(false);
        
        toast.success(`Tag "${newTag.name}" created and selected`);
      } catch (error) {
        console.error("Error parsing tag response:", error);
        toast.error("Failed to parse tag response");
      }
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create tag");
    }
  };

  // Update tag color
  const updateTagColor = async (tagId: string, color: string, tagName: string) => {
    try {
      console.log(`Updating tag ${tagId} color to ${color}`);
      
      // Submit to API
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ color }),
      });
      
      const responseText = await response.text();
      console.log("Update tag color response:", responseText);
      
      if (!response.ok) {
        throw new Error("Failed to update tag color");
      }
      
      // Update all local state that contains this tag
      setAllTags(prev => {
        const updated = prev.map(tag => 
          tag.id === tagId 
            ? { ...tag, color } 
            : tag
        );
        console.log("Updated allTags:", updated);
        return updated;
      });
      
      // Update top tags state
      setTopTags(prev => {
        const updated = prev.map(tag => 
          tag.id === tagId 
            ? { ...tag, color } 
            : tag
        );
        console.log("Updated topTags:", updated);
        return updated;
      });
      
      // Update filtered tags state
      setFilteredTags(prev => {
        const updated = prev.map(tag => 
          tag.id === tagId 
            ? { ...tag, color } 
            : tag
        );
        console.log("Updated filteredTags:", updated);
        return updated;
      });
      
      toast.success(`Updated color for tag "${tagName}"`);
      
      // Reset state
      setSelectedTagForColorEdit(null);
      setSelectedColor("");
      
      // Refresh tags to ensure UI is updated
      await fetchTags();
      await fetchTopTags();
    } catch (error) {
      console.error("Error updating tag color:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update tag color");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log New Interaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Interaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Interaction Type</Label>
            <Select
              value={type}
              onValueChange={(value: string) => setType(value as InteractionType)}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={InteractionType.CALL}>Call</SelectItem>
                <SelectItem value={InteractionType.EMAIL}>Email</SelectItem>
                <SelectItem value={InteractionType.MEETING}>Meeting</SelectItem>
                <SelectItem value={InteractionType.NOTE}>Note</SelectItem>
                <SelectItem value={InteractionType.TASK}>Task</SelectItem>
                <SelectItem value={InteractionType.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
          </div>
          
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details about this interaction..."
              className="min-h-[100px]"
            />
          </div>
          
          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            
            {/* Top Tags Quick Selection */}
            {!isLoadingTopTags && topTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-xs text-gray-500 mr-1 self-center">Popular:</span>
                {topTags.map(tag => (
                  <div
                    key={`top-${tag.id}`}
                    className="px-2 py-1 rounded-full text-xs flex items-center gap-1 hover:opacity-80 transition-opacity group relative cursor-pointer"
                    data-tag-id={tag.id}
                    style={{ 
                      backgroundColor: `${tag.color}20`, // 20% opacity
                      color: tag.color,
                      border: `1px solid ${tag.color}40` // 40% opacity border
                    }}
                    onClick={() => {
                      if (!selectedTagIds.includes(tag.id)) {
                        const newSelectedTagIds = [...selectedTagIds, tag.id];
                        setSelectedTagIds(newSelectedTagIds);
                        toast.success(`Tag "${tag.name}" selected`);
                      } else {
                        toast.info(`Tag "${tag.name}" already selected`);
                      }
                    }}
                  >
                    <span>{tag.name}</span>
                    <span
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTagForColorEdit(tag);
                        setSelectedColor(tag.color);
                      }}
                      title="Change color"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 relative">
              <div className="relative w-full flex-1">
                <Input
                  id="tags"
                  ref={tagInputRef}
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  onFocus={() => {
                    // Don't show suggestions when focusing if there's no search term
                    if (tagSearch.trim() && allTags.length > 0) {
                      setFilteredTags(allTags.filter(tag => 
                        tag.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
                        (tag.description && tag.description.toLowerCase().includes(tagSearch.toLowerCase()))
                      ));
                      setShowTagSuggestions(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!showTagSuggestions) {
                      if (e.key === 'ArrowDown' && filteredTags.length > 0) {
                        setShowTagSuggestions(true);
                        setFocusedSuggestionIndex(0);
                        e.preventDefault();
                      }
                      return;
                    }

                    switch (e.key) {
                      case 'ArrowDown':
                        setFocusedSuggestionIndex(prev => 
                          prev < filteredTags.length - 1 ? prev + 1 : prev
                        );
                        e.preventDefault();
                        break;
                      case 'ArrowUp':
                        setFocusedSuggestionIndex(prev => 
                          prev > 0 ? prev - 1 : prev
                        );
                        e.preventDefault();
                        break;
                      case 'Enter':
                        if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < filteredTags.length) {
                          selectTagFromSuggestions(filteredTags[focusedSuggestionIndex]);
                          e.preventDefault();
                        }
                        break;
                      case 'Escape':
                        setShowTagSuggestions(false);
                        e.preventDefault();
                        break;
                    }
                  }}
                  placeholder="Search or create tags..."
                  className="w-full pr-8"
                  autoComplete="off"
                />
                {/* Autocomplete indicator */}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </div>
              </div>
              {tagSearch.trim() && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={createOrFindTag}
                >
                  {allTags.some(tag => 
                    tag.name.toLowerCase() === tagSearch.trim().toLowerCase()
                  ) ? "Select" : "Create"}
                </Button>
              )}
              
              {/* Tag Suggestions Dropdown */}
              {showTagSuggestions && filteredTags.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-[200px] overflow-y-auto"
                  role="listbox"
                >
                  {tagSearch.trim() && (
                    <div className="px-3 py-2 text-xs text-gray-500 border-b">
                      {filteredTags.length} matching tags
                    </div>
                  )}
                  {filteredTags.map((tag, index) => {
                    // Highlight the matching part of the tag name
                    const tagName = tag.name;
                    const searchLower = tagSearch.toLowerCase();
                    const startIndex = tagName.toLowerCase().indexOf(searchLower);
                    
                    let beforeMatch = '';
                    let match = '';
                    let afterMatch = '';
                    
                    if (startIndex >= 0) {
                      beforeMatch = tagName.substring(0, startIndex);
                      match = tagName.substring(startIndex, startIndex + searchLower.length);
                      afterMatch = tagName.substring(startIndex + searchLower.length);
                    } else {
                      // Fallback if no match found (shouldn't happen due to filter)
                      match = tagName;
                    }
                    
                    return (
                      <div 
                        key={`suggestion-${tag.id}`}
                        className={`px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between ${
                          index === focusedSuggestionIndex ? 'bg-gray-100' : ''
                        }`}
                        onClick={() => selectTagFromSuggestions(tag)}
                        role="option"
                        aria-selected={selectedTagIds.includes(tag.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            selectTagFromSuggestions(tag);
                            e.preventDefault();
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <span 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: tag.color }}
                          ></span>
                          <span>
                            {beforeMatch}
                            <span className="font-bold bg-yellow-100">{match}</span>
                            {afterMatch}
                          </span>
                        </div>
                        {selectedTagIds.includes(tag.id) && (
                          <span className="text-green-500 text-sm">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Loading indicator */}
            {isLoadingTags && (
              <div className="flex justify-center py-2 mt-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              </div>
            )}
            
            {/* Selected Tags Display */}
            {selectedTagIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTagIds.map(tagId => {
                  const tag = allTags.find(t => t.id === tagId);
                  if (!tag) return null;
                  
                  return (
                      <div 
                        key={`selected-${tag.id}`}
                        className="px-2 py-1 rounded-full text-xs flex items-center gap-1 group relative"
                        data-tag-id={tag.id}
                        style={{ 
                          backgroundColor: `${tag.color}20`, // 20% opacity
                          color: tag.color 
                        }}
                      >
                        <span>{tag.name}</span>
                        <div className="flex items-center">
                          <span
                            className="ml-1 opacity-100 text-xs font-bold cursor-pointer"
                            onClick={() => toggleTag(tag.id)}
                          >
                            ×
                          </span>
                          <span
                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => {
                              setSelectedTagForColorEdit(tag);
                              setSelectedColor(tag.color);
                            }}
                            title="Change color"
                          >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="12" 
                              height="12" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10"></circle>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </span>
                        </div>
                      </div>
                  );
                })}
              </div>
            )}
            

            {/* Color Edit Popover */}
            {selectedTagForColorEdit && (
              <div className="absolute bg-white border rounded-md shadow-lg z-50 p-3 color-picker-container"
                   style={{
                     top: '50%',
                     left: '50%',
                     transform: 'translate(-50%, -50%)'
                   }}
              >
                <h4 className="font-medium mb-2 text-sm">Change color</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        console.log(`Selected color: ${color}`);
                        // Only update if the color is different
                        if (selectedColor !== color) {
                          setSelectedColor(color);
                          // Auto-apply the color change when a color is selected
                          if (selectedTagForColorEdit) {
                            updateTagColor(selectedTagForColorEdit.id, color, selectedTagForColorEdit.name);
                          }
                        } else {
                          // If the same color is selected again, just close the color picker
                          setSelectedTagForColorEdit(null);
                          setSelectedColor("");
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Interaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
