"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
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
import { DynamicFieldsManager } from "@/features/people/components/DynamicFieldsManager";

interface AddPersonFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonAdded?: () => void;
  trigger?: React.ReactNode;
}

export function AddPersonForm({ 
  isOpen, 
  onOpenChange, 
  onPersonAdded,
  trigger 
}: AddPersonFormProps) {
  // We use useSession to ensure the user is authenticated
  useSession({ required: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Person>>({
    name: "",
    email: "",
    phone: "",
    role: "",
    company: "",
    status: PersonStatus.ACTIVE,
    notes: "",
    address: "",
    dynamicFields: []
  });

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle status change in dropdown
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, status: value as PersonStatus }));
  };

  // Handle dynamic fields changes
  const handleDynamicFieldsChange = (fields: DynamicField[]) => {
    setFormData(prev => ({ ...prev, dynamicFields: fields }));
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      company: "",
      status: PersonStatus.ACTIVE,
      notes: "",
      address: "",
      dynamicFields: []
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name) {
        toast.error("Name is required");
        setIsSubmitting(false);
        return;
      }

      // Send data to API
      const response = await fetch(`/api/people`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create person");
      }

      // Success
      toast.success("Person created successfully");
      
      // Reset form
      resetForm();
      
      // Close dialog
      onOpenChange(false);
      
      // Notify parent component to refresh the list
      if (onPersonAdded) {
        onPersonAdded();
      }
    } catch (error) {
      console.error("Error creating person:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create person");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Person</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">
                Company
              </Label>
              <Input
                id="company"
                name="company"
                value={formData.company || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Input
                id="role"
                name="role"
                value={formData.role || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select-category" disabled>Select a category</SelectItem>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input
                id="address"
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right pt-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes || ""}
                onChange={handleChange}
                className="col-span-3"
                rows={3}
              />
            </div>
            
            <div className="col-span-4 mt-4">
              <DynamicFieldsManager
                personId="new"
                initialFields={formData.dynamicFields || []}
                onFieldsChange={handleDynamicFieldsChange}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
