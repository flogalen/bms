import { Request, Response } from "express";
import personService from "../../services/person.service";
import { PersonStatus, FieldType } from "@prisma/client";

/**
 * Get all people with optional filtering and pagination
 */
export const getPeople = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract query parameters
    const { status, search, page, limit, category } = req.query;
    
    // Build filters
    const filters: { status?: PersonStatus; search?: string; category?: 'BUSINESS' | 'PERSONAL' } = {};
    
    if (status) {
      try {
        // Check if status is a valid PersonStatus enum value
        if (Object.values(PersonStatus).includes(status as PersonStatus)) {
          filters.status = status as PersonStatus;
        }
      } catch (error) {
        console.warn("Invalid status filter:", status);
        // Continue without applying the status filter
      }
    }
    
    // Handle category filter
    if (category && typeof category === 'string') {
      if (category === 'BUSINESS' || category === 'PERSONAL') {
        filters.category = category as 'BUSINESS' | 'PERSONAL';
      }
    }
    
    if (search && typeof search === 'string') {
      filters.search = search;
    }
    
    // Build pagination
    const pagination = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10
    };
    
    // Get people from service
    const result = await personService.getPeople(filters, pagination);
    
    res.status(200).json(result);
  } catch (error) {
    console.error("Get people error:", error);
    res.status(500).json({ error: (error as Error).message || "Something went wrong" });
  }
};

/**
 * Get a person by ID
 */
export const getPersonById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const person = await personService.getPersonById(id);
    
    if (!person) {
      res.status(404).json({ error: "Person not found" });
      return;
    }
    
    res.status(200).json(person);
  } catch (error) {
    console.error("Get person error:", error);
    res.status(500).json({ error: (error as Error).message || "Something went wrong" });
  }
};

/**
 * Create a new person
 */
export const createPerson = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user ID from authenticated request
    const createdById = req.user?.id;
    
    // Combine request body with creator ID
    const personData = {
      ...req.body,
      createdById
    };
    
    const person = await personService.createPerson(personData);
    
    res.status(201).json(person);
  } catch (error) {
    console.error("Create person error:", error);
    
    // Handle validation errors
    if ((error as Error).message.includes("required") || 
        (error as Error).message.includes("Invalid")) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    
    res.status(500).json({ error: (error as Error).message || "Something went wrong" });
  }
};

/**
 * Update a person
 */
export const updatePerson = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.id; // Get authenticated user ID

    // TODO: AUTHORIZATION: Ensure personService.updatePerson checks if userId is authorized to update person with 'id'.
    const person = await personService.updatePerson(id, updateData, userId); 
    
    res.status(200).json(person);
  } catch (error) {
    console.error("Update person error:", error);
    
    // Handle not found error
    if ((error as Error).message.includes("not found")) {
      res.status(404).json({ error: (error as Error).message });
      return;
    }
    
    // Handle validation errors
    if ((error as Error).message.includes("Invalid")) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    
    res.status(500).json({ error: (error as Error).message || "Something went wrong" });
  }
};

/**
 * Delete a person
 */
export const deletePerson = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Get authenticated user ID

    // TODO: AUTHORIZATION: Ensure personService.deletePerson checks if userId is authorized to delete person with 'id'.
    const result = await personService.deletePerson(id, userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error("Delete person error:", error);
    
    // Handle not found error
    if ((error as Error).message.includes("not found")) {
      res.status(404).json({ error: (error as Error).message });
      return;
    }
    
    res.status(500).json({ error: (error as Error).message || "Something went wrong" });
  }
};

/**
 * Add a dynamic field to a person
 */
export const addDynamicField = async (req: Request, res: Response): Promise<void> => {
  try {
    const { personId } = req.params;
    const fieldData = req.body;
    const userId = req.user?.id; // Get authenticated user ID

    // TODO: AUTHORIZATION: Ensure personService.addDynamicField checks if userId is authorized to modify person with 'personId'.

    // Validate field type
    if (!fieldData.fieldType || !Object.values(FieldType).includes(fieldData.fieldType as FieldType)) {
      res.status(400).json({ error: "Invalid field type" });
      return;
    }
    
    const dynamicField = await personService.addDynamicField(personId, fieldData, userId);
    
    res.status(201).json(dynamicField);
  } catch (error) {
    console.error("Add dynamic field error:", error);
    
    // Handle not found error
    if ((error as Error).message.includes("not found")) {
      res.status(404).json({ error: (error as Error).message });
      return;
    }
    
    // Handle validation errors
    if ((error as Error).message.includes("required") || 
        (error as Error).message.includes("Invalid")) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    
    res.status(500).json({ error: (error as Error).message || "Something went wrong" });
  }
};

/**
 * Remove a dynamic field from a person
 */
export const removeDynamicField = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fieldId } = req.params;
    const userId = req.user?.id; // Get authenticated user ID

    // TODO: AUTHORIZATION: Ensure personService.removeDynamicField checks if userId is authorized to remove this field 
    // (e.g., by checking ownership of the associated person record).
    const result = await personService.removeDynamicField(fieldId, userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error("Remove dynamic field error:", error);
    
    // Handle not found error
    if ((error as Error).message.includes("not found")) {
      res.status(404).json({ error: (error as Error).message });
      return;
    }
    
    res.status(500).json({ error: (error as Error).message || "Something went wrong" });
  }
};
