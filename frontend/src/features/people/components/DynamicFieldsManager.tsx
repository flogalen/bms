"use client";

import { useState, useEffect } from "react";
import { DynamicField, FieldType } from "@/features/people/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

interface DynamicFieldsManagerProps {
  personId: string;
  initialFields: DynamicField[];
  onFieldsChange: (fields: DynamicField[]) => void;
}

export function DynamicFieldsManager({
  personId,
  initialFields,
  onFieldsChange,
}: DynamicFieldsManagerProps) {
  const [fields, setFields] = useState<DynamicField[]>(initialFields || []);
  const [newField, setNewField] = useState<Partial<DynamicField>>({
    fieldName: "",
    fieldType: FieldType.STRING,
    stringValue: "",
  });
  const [isAddingField, setIsAddingField] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update fields when initialFields changes
  useEffect(() => {
    setFields(initialFields || []);
  }, [initialFields]);

  // Handle field type change
  const handleFieldTypeChange = (type: FieldType) => {
    setNewField((prev) => {
      // Reset values based on new type
      const updatedField: Partial<DynamicField> = {
        ...prev,
        fieldType: type,
        stringValue: type === FieldType.STRING || type === FieldType.EMAIL || 
                    type === FieldType.URL || type === FieldType.PHONE ? "" : undefined,
        numberValue: type === FieldType.NUMBER ? 0 : undefined,
        booleanValue: type === FieldType.BOOLEAN ? false : undefined,
        dateValue: type === FieldType.DATE ? new Date().toISOString() : undefined, // Full ISO format with time
      };
      return updatedField;
    });
    setValidationError(null);
  };

  // Validate field value based on type
  const validateFieldValue = (field: Partial<DynamicField>): boolean => {
    if (!field.fieldName) {
      setValidationError("Field name is required");
      return false;
    }

    // Check if field name already exists
    if (fields.some(f => f.fieldName === field.fieldName)) {
      setValidationError("Field name already exists");
      return false;
    }

    switch (field.fieldType) {
      case FieldType.EMAIL:
        if (!field.stringValue || !isValidEmail(field.stringValue)) {
          setValidationError("Please enter a valid email address");
          return false;
        }
        break;
      case FieldType.URL:
        if (!field.stringValue || !isValidUrl(field.stringValue)) {
          setValidationError("Please enter a valid URL");
          return false;
        }
        break;
      case FieldType.PHONE:
        if (!field.stringValue || !isValidPhone(field.stringValue)) {
          setValidationError("Please enter a valid phone number");
          return false;
        }
        break;
      case FieldType.STRING:
        if (field.stringValue === undefined || field.stringValue === null) {
          setValidationError("Text value is required");
          return false;
        }
        break;
      case FieldType.NUMBER:
        if (field.numberValue === undefined || field.numberValue === null) {
          setValidationError("Number value is required");
          return false;
        }
        break;
      case FieldType.DATE:
        if (!field.dateValue) {
          setValidationError("Date value is required");
          return false;
        }
        break;
    }

    return true;
  };

  // Validation helpers
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
    return phoneRegex.test(phone);
  };

  // Add a new field
  const handleAddField = () => {
    if (!validateFieldValue(newField)) {
      return;
    }

    // Create a temporary ID for new fields (will be replaced by backend)
    const tempId = `temp-${Date.now()}`;
    
    const newFieldComplete = {
      id: tempId,
      fieldName: newField.fieldName!,
      fieldType: newField.fieldType!,
      stringValue: newField.stringValue,
      numberValue: newField.numberValue,
      booleanValue: newField.booleanValue,
      dateValue: newField.dateValue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      personId: personId,
    };

    const updatedFields = [...fields, newFieldComplete];
    setFields(updatedFields);
    onFieldsChange(updatedFields);
    
    // Reset form
    setNewField({
      fieldName: "",
      fieldType: FieldType.STRING,
      stringValue: "",
    });
    setIsAddingField(false);
    setValidationError(null);
  };

  // Remove a field
  const handleRemoveField = (id: string) => {
    const updatedFields = fields.filter((field) => field.id !== id);
    setFields(updatedFields);
    onFieldsChange(updatedFields);
  };

  // Move field up in order
  const handleMoveUp = (index: number) => {
    if (index === 0) return; // Already at the top
    
    const updatedFields = [...fields];
    const temp = updatedFields[index];
    updatedFields[index] = updatedFields[index - 1];
    updatedFields[index - 1] = temp;
    
    setFields(updatedFields);
    onFieldsChange(updatedFields);
  };

  // Move field down in order
  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return; // Already at the bottom
    
    const updatedFields = [...fields];
    const temp = updatedFields[index];
    updatedFields[index] = updatedFields[index + 1];
    updatedFields[index + 1] = temp;
    
    setFields(updatedFields);
    onFieldsChange(updatedFields);
  };

  // Update field value
  const handleFieldValueChange = (id: string, value: string | number | boolean | "indeterminate") => {
    const updatedFields = fields.map((field) => {
      if (field.id === id) {
        const updatedField = { ...field };
        
        switch (field.fieldType) {
          case FieldType.STRING:
          case FieldType.EMAIL:
          case FieldType.URL:
          case FieldType.PHONE:
            updatedField.stringValue = value as string;
            break;
          case FieldType.NUMBER:
            updatedField.numberValue = typeof value === 'string' ? parseFloat(value) : value as number;
            break;
          case FieldType.BOOLEAN:
            updatedField.booleanValue = value === "indeterminate" ? false : value as boolean;
            break;
          case FieldType.DATE:
            updatedField.dateValue = value as string;
            break;
        }
        
        return updatedField;
      }
      return field;
    });
    
    setFields(updatedFields);
    onFieldsChange(updatedFields);
  };

  // Render field input based on type
  const renderFieldInput = (field: DynamicField) => {
    switch (field.fieldType) {
      case FieldType.STRING:
        return (
          <Input
            value={field.stringValue || ""}
            onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
            className="w-full"
          />
        );
      case FieldType.EMAIL:
        return (
          <Input
            type="email"
            value={field.stringValue || ""}
            onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
            className="w-full"
          />
        );
      case FieldType.URL:
        return (
          <Input
            type="url"
            value={field.stringValue || ""}
            onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
            className="w-full"
          />
        );
      case FieldType.PHONE:
        return (
          <Input
            type="tel"
            value={field.stringValue || ""}
            onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
            className="w-full"
          />
        );
      case FieldType.NUMBER:
        return (
          <Input
            type="number"
            value={field.numberValue || 0}
            onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
            className="w-full"
          />
        );
      case FieldType.BOOLEAN:
        return (
          <Checkbox
            checked={field.booleanValue || false}
            onCheckedChange={(checked: boolean | "indeterminate") => 
              handleFieldValueChange(field.id, checked)
            }
          />
        );
      case FieldType.DATE:
        return (
          <Input
            type="date"
            value={field.dateValue ? new Date(field.dateValue).toISOString().split('T')[0] : ""}
            onChange={(e) => {
              // Convert date string to full ISO format with time
              const dateValue = e.target.value ? new Date(e.target.value + 'T00:00:00Z').toISOString() : "";
              handleFieldValueChange(field.id, dateValue);
            }}
            className="w-full"
          />
        );
      default:
        return <div>Unsupported field type</div>;
    }
  };

  // Render new field input based on type
  const renderNewFieldInput = () => {
    switch (newField.fieldType) {
      case FieldType.STRING:
        return (
          <Input
            value={newField.stringValue || ""}
            onChange={(e) => setNewField({ ...newField, stringValue: e.target.value })}
            placeholder="Enter text value"
            className="w-full"
          />
        );
      case FieldType.EMAIL:
        return (
          <Input
            type="email"
            value={newField.stringValue || ""}
            onChange={(e) => setNewField({ ...newField, stringValue: e.target.value })}
            placeholder="Enter email address"
            className="w-full"
          />
        );
      case FieldType.URL:
        return (
          <Input
            type="url"
            value={newField.stringValue || ""}
            onChange={(e) => setNewField({ ...newField, stringValue: e.target.value })}
            placeholder="Enter URL"
            className="w-full"
          />
        );
      case FieldType.PHONE:
        return (
          <Input
            type="tel"
            value={newField.stringValue || ""}
            onChange={(e) => setNewField({ ...newField, stringValue: e.target.value })}
            placeholder="Enter phone number"
            className="w-full"
          />
        );
      case FieldType.NUMBER:
        return (
          <Input
            type="number"
            value={newField.numberValue || ""}
            onChange={(e) => setNewField({ ...newField, numberValue: parseFloat(e.target.value) })}
            placeholder="Enter number value"
            className="w-full"
          />
        );
      case FieldType.BOOLEAN:
        return (
          <Checkbox
            checked={newField.booleanValue || false}
            onCheckedChange={(checked: boolean | "indeterminate") => 
              setNewField({ ...newField, booleanValue: checked === "indeterminate" ? false : checked })
            }
          />
        );
      case FieldType.DATE:
        return (
          <Input
            type="date"
            value={newField.dateValue ? new Date(newField.dateValue).toISOString().split('T')[0] : ""}
            onChange={(e) => {
              // Convert date string to full ISO format with time
              const dateValue = e.target.value ? new Date(e.target.value + 'T00:00:00Z').toISOString() : "";
              setNewField({ ...newField, dateValue: dateValue });
            }}
            className="w-full"
          />
        );
      default:
        return <div>Unsupported field type</div>;
    }
  };

  // Get field type display name
  const getFieldTypeDisplayName = (type: FieldType): string => {
    switch (type) {
      case FieldType.STRING:
        return "Text";
      case FieldType.NUMBER:
        return "Number";
      case FieldType.BOOLEAN:
        return "Yes/No";
      case FieldType.DATE:
        return "Date";
      case FieldType.URL:
        return "URL";
      case FieldType.EMAIL:
        return "Email";
      case FieldType.PHONE:
        return "Phone";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Custom Fields</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddingField(true)}
          disabled={isAddingField}
        >
          Add Field
        </Button>
      </div>

      {/* Existing fields */}
      {fields.length > 0 ? (
        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="border rounded-md p-3 bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{field.fieldName}</div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {getFieldTypeDisplayName(field.fieldType)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Move up button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                    title="Move up"
                  >
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
                      <path d="m18 15-6-6-6 6"/>
                    </svg>
                  </Button>
                  
                  {/* Move down button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === fields.length - 1}
                    className="h-8 w-8 p-0"
                    title="Move down"
                  >
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
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </Button>
                  
                  {/* Delete button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveField(field.id)}
                    className="text-red-500 h-8 w-8 p-0"
                    title="Delete field"
                  >
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
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </Button>
                </div>
              </div>
              <div className="mt-2">{renderFieldInput(field)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 border rounded-md">
          No custom fields added yet
        </div>
      )}

      {/* Add new field form - shown in a dialog for better UX */}
      <Dialog open={isAddingField} onOpenChange={setIsAddingField}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="fieldName">Field Name</Label>
                <Input
                  id="fieldName"
                  value={newField.fieldName || ""}
                  onChange={(e) => setNewField({ ...newField, fieldName: e.target.value })}
                  placeholder="e.g. Birthday, Website, LinkedIn"
                />
              </div>
              <div>
                <Label htmlFor="fieldType">Field Type</Label>
                <Select
                  value={newField.fieldType}
                  onValueChange={(value: string) => handleFieldTypeChange(value as FieldType)}
                >
                  <SelectTrigger id="fieldType">
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FieldType.STRING}>Text</SelectItem>
                    <SelectItem value={FieldType.NUMBER}>Number</SelectItem>
                    <SelectItem value={FieldType.BOOLEAN}>Yes/No</SelectItem>
                    <SelectItem value={FieldType.DATE}>Date</SelectItem>
                    <SelectItem value={FieldType.URL}>URL</SelectItem>
                    <SelectItem value={FieldType.EMAIL}>Email</SelectItem>
                    <SelectItem value={FieldType.PHONE}>Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="fieldValue">Field Value</Label>
                {renderNewFieldInput()}
              </div>
            </div>
            
            {validationError && (
              <div className="text-red-500 text-sm">{validationError}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddingField(false);
                setValidationError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddField}>
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
