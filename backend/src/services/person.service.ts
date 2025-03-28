/**
 * Person Service
 * 
 * This service handles business logic for Person entities.
 * 
 * IMPORTANT: Before using this service, make sure to regenerate the Prisma client
 * by running: npm run prisma:generate
 * 
 * This is necessary because we've added new models to the schema.
 */

import { Prisma } from "@prisma/client";
import prisma from "../prisma";

// Import Prisma-generated enums
import { PersonStatus, FieldType } from "@prisma/client";

export interface Person {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  company?: string | null;
  status: PersonStatus;
  notes?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById?: string | null;
  dynamicFields?: DynamicField[];
  interactions?: any[]; // We don't need the full type for interactions in this service
  lastInteraction?: Date | null; // Last interaction date
}

export interface DynamicField {
  id: string;
  fieldName: string;
  fieldType: FieldType;
  stringValue?: string | null;
  numberValue?: number | null;
  booleanValue?: boolean | null;
  dateValue?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  personId: string;
}

// Define interfaces for our service methods
export interface CreatePersonInput {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  status?: PersonStatus;
  notes?: string;
  address?: string;
  createdById?: string;
  dynamicFields?: DynamicFieldInput[];
}

export interface UpdatePersonInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  status?: PersonStatus;
  notes?: string;
  address?: string;
  dynamicFields?: DynamicFieldInput[];
}

export interface DynamicFieldInput {
  fieldName: string;
  fieldType: FieldType;
  stringValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateValue?: Date;
}

export interface PersonServiceError extends Error {
  code?: string;
}

export class PersonService {
  /**
   * Create a new person
   */
  async createPerson(data: CreatePersonInput): Promise<Person> {
    try {
      // Validate required fields
      this.validatePersonData(data);

      // Extract dynamic fields from the input
      const { dynamicFields, ...personData } = data;

      // Create the person
      const person = await prisma.person.create({
        data: {
          ...personData,
          // Create dynamic fields if provided
          ...(dynamicFields && dynamicFields.length > 0
            ? {
                dynamicFields: {
                  create: dynamicFields.map(field => this.mapDynamicField(field)),
                },
              }
            : {}),
        },
        include: {
          dynamicFields: true,
        },
      });

      return person;
    } catch (error) {
      return this.handleError(error as Error, "Error creating person");
    }
  }

  /**
   * Get a person by ID
   */
  async getPersonById(id: string): Promise<Person | null> {
    try {
      // Simplified version without excessive logging
      const person = await prisma.person.findUnique({
        where: { id },
        include: {
          dynamicFields: true,
          interactions: true,
        },
      });
      
      return person;
    } catch (error) {
      return this.handleError(error as Error, "Error fetching person");
    }
  }

  /**
   * Get all people with optional filtering
   */
  async getPeople(
    filters?: {
      status?: PersonStatus;
      search?: string;
      category?: 'BUSINESS' | 'PERSONAL';
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ people: Person[]; total: number }> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const skip = (page - 1) * limit;

      // Build the where clause based on filters
      let where: any = {};

      if (filters?.status) {
        where.status = filters.status;
      }

      // Handle category filter (BUSINESS or PERSONAL)
      if (filters?.category) {
        if (filters.category === 'BUSINESS') {
          where.status = {
            in: [
              'ACTIVE',
              'INACTIVE',
              'LEAD',
              'CUSTOMER',
              'VENDOR',
              'PARTNER'
            ]
          };
        } else if (filters.category === 'PERSONAL') {
          where.status = {
            in: [
              'FRIEND',
              'FAMILY',
              'ACQUAINTANCE'
            ]
          };
        }
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search, mode: 'insensitive' } },
          { role: { contains: filters.search, mode: 'insensitive' } },
          { company: { contains: filters.search, mode: 'insensitive' } },
          { notes: { contains: filters.search, mode: 'insensitive' } },
          { address: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const total = await prisma.person.count({ where });

      // Get people with pagination
      const people = await prisma.person.findMany({
        where,
        include: {
          dynamicFields: true,
          interactions: {
            orderBy: {
              date: 'desc'
            },
            take: 1
          }
        },
        skip,
        take: limit,
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Add last interaction date to each person
      const peopleWithLastInteraction = people.map(person => {
        const lastInteraction = person.interactions && person.interactions.length > 0 
          ? person.interactions[0].date 
          : null;
        
        return {
          ...person,
          lastInteraction
        };
      });

      return { people: peopleWithLastInteraction, total };
    } catch (error) {
      return this.handleError(error as Error, "Error fetching people");
    }
  }

  /**
   * Update a person
   */
  async updatePerson(id: string, data: UpdatePersonInput, userId?: string): Promise<Person> {
    try {
      // Check if person exists
      const existingPerson = await prisma.person.findUnique({
        where: { id },
        include: { dynamicFields: true },
      });

      if (!existingPerson) {
        throw new Error(`Person with ID ${id} not found`);
      }

      // Authorization check: Ensure the user owns the record
      if (!userId || existingPerson.createdById !== userId) {
        throw new Error("Unauthorized: You do not have permission to update this person.");
      }

      // Extract dynamic fields from the input
      const { dynamicFields, ...personData } = data;

      // Update the person
      const updatedPerson = await prisma.person.update({
        where: { id },
        data: {
          ...personData,
          updatedAt: new Date(),
        },
        include: {
          dynamicFields: true,
        },
      });

      // If dynamic fields are provided, handle them separately
      if (dynamicFields && dynamicFields.length > 0) {
        await this.updateDynamicFields(id, dynamicFields);
      }

      // Fetch the updated person with all related data
      return await prisma.person.findUnique({
        where: { id },
        include: {
          dynamicFields: true,
        },
      }) as Person;
    } catch (error) {
      return this.handleError(error as Error, "Error updating person");
    }
  }

  /**
   * Delete a person
   */
  async deletePerson(id: string, userId?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if person exists
      const existingPerson = await prisma.person.findUnique({
        where: { id },
      });

      if (!existingPerson) {
        throw new Error(`Person with ID ${id} not found`);
      }

      // Authorization check: Ensure the user owns the record
      if (!userId || existingPerson.createdById !== userId) {
        throw new Error("Unauthorized: You do not have permission to delete this person.");
      }

      // Delete the person (this will cascade delete related records)
      await prisma.person.delete({
        where: { id },
      });

      return { success: true, message: "Person deleted successfully" };
    } catch (error) {
      return this.handleError(error as Error, "Error deleting person");
    }
  }

  /**
   * Add a dynamic field to a person
   */
  async addDynamicField(personId: string, field: DynamicFieldInput, userId?: string): Promise<DynamicField> {
    try {
      // Check if person exists
      const existingPerson = await prisma.person.findUnique({
        where: { id: personId },
      });

      if (!existingPerson) {
        throw new Error(`Person with ID ${personId} not found`);
      }

      // Authorization check: Ensure the user owns the person record
      if (!userId || existingPerson.createdById !== userId) {
        throw new Error("Unauthorized: You do not have permission to add fields to this person.");
      }

      // Create the dynamic field
      const dynamicField = await prisma.dynamicField.create({
        data: {
          ...this.mapDynamicField(field),
          personId,
        },
      });

      return dynamicField;
    } catch (error) {
      return this.handleError(error as Error, "Error adding dynamic field");
    }
  }

  /**
   * Remove a dynamic field from a person
   */
  async removeDynamicField(fieldId: string, userId?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if field exists and get its associated person
      const existingField = await prisma.dynamicField.findUnique({
        where: { id: fieldId },
        include: { person: true } // Include the person to check ownership
      });

      if (!existingField) {
        throw new Error(`Dynamic field with ID ${fieldId} not found`);
      }

      // Authorization check: Ensure the user owns the associated person record
      if (!userId || !existingField.person || existingField.person.createdById !== userId) {
         throw new Error("Unauthorized: You do not have permission to remove this field.");
      }

      // Delete the field
      await prisma.dynamicField.delete({
        where: { id: fieldId },
      });

      return { success: true, message: "Dynamic field removed successfully" };
    } catch (error) {
      return this.handleError(error as Error, "Error removing dynamic field");
    }
  }

  /**
   * Update dynamic fields for a person
   * This method will add new fields, update existing ones, and remove fields not in the input
   */
  private async updateDynamicFields(personId: string, fields: DynamicFieldInput[]): Promise<void> {
    try {
      // Get existing fields
      const existingFields = await prisma.dynamicField.findMany({
        where: { personId },
      });

      // Create a map of existing fields by name for easier lookup
      const existingFieldMap = new Map<string, DynamicField>();
      existingFields.forEach((field: any) => {
        existingFieldMap.set(field.fieldName, field);
      });

      // Process each field in the input
      for (const field of fields) {
        const existingField = existingFieldMap.get(field.fieldName);

        if (existingField) {
          // Update existing field
          await prisma.dynamicField.update({
            where: { id: existingField.id },
            data: this.mapDynamicField(field),
          });
          // Remove from map to track which ones to delete later
          existingFieldMap.delete(field.fieldName);
        } else {
          // Create new field
          await prisma.dynamicField.create({
            data: {
              ...this.mapDynamicField(field),
              personId,
            },
          });
        }
      }

      // Delete fields that weren't in the input
      if (existingFieldMap.size > 0) {
        const fieldsToDelete = Array.from(existingFieldMap.values()).map(field => field.id);
        await prisma.dynamicField.deleteMany({
          where: {
            id: { in: fieldsToDelete },
          },
        });
      }
    } catch (error) {
      return this.handleError(error as Error, "Error updating dynamic fields");
    }
  }

  /**
   * Map a dynamic field input to the correct Prisma format
   */
  private mapDynamicField(field: DynamicFieldInput): any {
    const { fieldName, fieldType, stringValue, numberValue, booleanValue, dateValue } = field;
    
    // Validate that the value matches the field type
    this.validateFieldValue(field);
    
    return {
      fieldName,
      fieldType,
      stringValue,
      numberValue,
      booleanValue,
      dateValue,
      // The person relation will be handled separately when creating/updating
    };
  }

  /**
   * Validate that a person has all required fields
   */
  private validatePersonData(data: CreatePersonInput | UpdatePersonInput): void {
    // For create operations, name is required
    if ('name' in data && !data.name) {
      throw new Error("Name is required");
    }

    // Validate email format if provided
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error("Invalid email format");
    }

    // Validate phone format if provided
    if (data.phone && !this.isValidPhone(data.phone)) {
      throw new Error("Invalid phone format");
    }
  }

  /**
   * Validate that a dynamic field's value matches its type
   */
  private validateFieldValue(field: DynamicFieldInput): void {
    const { fieldType, stringValue, numberValue, booleanValue, dateValue } = field;

    switch (fieldType) {
      case FieldType.STRING:
      case FieldType.EMAIL:
      case FieldType.URL:
      case FieldType.PHONE:
        if (stringValue === undefined) {
          throw new Error(`String value is required for field type ${fieldType}`);
        }
        
        // Additional validation for specific string types
        if (fieldType === FieldType.EMAIL && !this.isValidEmail(stringValue)) {
          throw new Error("Invalid email format for EMAIL field type");
        }
        if (fieldType === FieldType.URL && !this.isValidUrl(stringValue)) {
          throw new Error("Invalid URL format for URL field type");
        }
        if (fieldType === FieldType.PHONE && !this.isValidPhone(stringValue)) {
          throw new Error("Invalid phone format for PHONE field type");
        }
        break;
        
      case FieldType.NUMBER:
        if (numberValue === undefined) {
          throw new Error("Number value is required for NUMBER field type");
        }
        break;
        
      case FieldType.BOOLEAN:
        if (booleanValue === undefined) {
          throw new Error("Boolean value is required for BOOLEAN field type");
        }
        break;
        
      case FieldType.DATE:
        if (dateValue === undefined) {
          throw new Error("Date value is required for DATE field type");
        }
        break;
        
      default:
        throw new Error(`Unsupported field type: ${fieldType}`);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate phone format (simple validation)
   */
  private isValidPhone(phone: string): boolean {
    // Allow digits, spaces, dashes, parentheses, and plus sign
    // This is a simple validation - could be enhanced for specific formats
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
    return phoneRegex.test(phone);
  }

  /**
   * Handle errors in a consistent way
   */
  private handleError(error: Error, message: string): never {
    console.error(`${message}:`, error);
    
    // Create a custom error with additional context
    const serviceError: PersonServiceError = new Error(
      error.message || message
    );
    
    // If it's a Prisma error, add the code
    // Check if Prisma.PrismaClientKnownRequestError exists to avoid errors in tests
    if (Prisma && 
        typeof Prisma === 'object' && 
        'PrismaClientKnownRequestError' in Prisma && 
        error instanceof Prisma.PrismaClientKnownRequestError) {
      serviceError.code = error.code;
    }
    
    throw serviceError;
  }
}

export default new PersonService();
