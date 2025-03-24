import { Request, Response } from "express";
import personService from "../../services/person.service";
import { PersonStatus, FieldType } from "../../services/person.service";

/**
 * Get all people with optional filtering and pagination
 */
export const getPeople = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract query parameters
    const { status, search, page, limit } = req.query;
    
    // Build filters
    const filters: { status?: PersonStatus; search?: string } = {};
    if (status && Object.values(PersonStatus).includes(status as PersonStatus)) {
      filters.status = status as PersonStatus;
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
    
    const person = await personService.updatePerson(id, updateData);
    
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
    
    const result = await personService.deletePerson(id);
    
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
    
    // Validate field type
    if (!fieldData.fieldType || !Object.values(FieldType).includes(fieldData.fieldType as FieldType)) {
      res.status(400).json({ error: "Invalid field type" });
      return;
    }
    
    const dynamicField = await personService.addDynamicField(personId, fieldData);
    
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
    
    const result = await personService.removeDynamicField(fieldId);
    
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
