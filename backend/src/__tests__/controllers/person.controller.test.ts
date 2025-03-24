import { Request, Response } from "express";
import * as personController from "../../controllers/person/person.controller";
import { PersonStatus, FieldType } from "../../services/person.service";
import { mockPrisma, setupPrismaMock } from "../mocks/prisma.mock";

// Initialize Prisma mock
setupPrismaMock();

describe("Person Controller", () => {
  // Set a higher timeout for all tests in this suite
  jest.setTimeout(30000);

  // Mock request and response objects
  let req: Partial<Request>;
  let res: Partial<Response>;
  let resJson: jest.Mock;
  let resStatus: jest.Mock;

  beforeEach(() => {
    // Reset Prisma mock for each test
    setupPrismaMock();
    
    // Clear other mock history but preserve implementations
    jest.clearAllMocks();
    
    // Set up mock request and response objects
    resJson = jest.fn().mockReturnThis();
    resStatus = jest.fn().mockReturnValue({ json: resJson });
    
    req = {
      params: {},
      query: {},
      body: {},
      user: { id: "test-user-id", email: "test@example.com", role: "USER" }
    };
    
    res = {
      status: resStatus,
      json: resJson
    };
  });

  describe("getPeople", () => {
    it("should return a list of people", async () => {
      // Arrange
      const now = new Date().toISOString();
      const mockPeople = [
        {
          id: "1",
          name: "John Doe",
          email: "john@example.com",
          status: PersonStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
          dynamicFields: [],
        },
        {
          id: "2",
          name: "Jane Smith",
          email: "jane@example.com",
          status: PersonStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
          dynamicFields: [],
        },
      ];

      mockPrisma.person.count.mockResolvedValue(2);
      mockPrisma.person.findMany.mockResolvedValue(mockPeople);

      // Act
      await personController.getPeople(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({ people: mockPeople, total: 2 });
      expect(mockPrisma.person.count).toHaveBeenCalled();
      expect(mockPrisma.person.findMany).toHaveBeenCalled();
    });

    it("should filter people by status", async () => {
      // Arrange
      req.query = { status: PersonStatus.LEAD };
      
      const now = new Date().toISOString();
      const mockPeople = [
        {
          id: "1",
          name: "John Doe",
          email: "john@example.com",
          status: PersonStatus.LEAD,
          createdAt: now,
          updatedAt: now,
          dynamicFields: [],
        },
      ];

      mockPrisma.person.count.mockResolvedValue(1);
      mockPrisma.person.findMany.mockResolvedValue(mockPeople);

      // Act
      await personController.getPeople(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({ people: mockPeople, total: 1 });
      expect(mockPrisma.person.count).toHaveBeenCalledWith({
        where: { status: PersonStatus.LEAD },
      });
    });
  });

  describe("getPersonById", () => {
    it("should return a person by ID", async () => {
      // Arrange
      const personId = "1";
      req.params = { id: personId };
      
      const now = new Date().toISOString();
      const mockPerson = {
        id: personId,
        name: "John Doe",
        email: "john@example.com",
        status: PersonStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
        dynamicFields: [],
        interactions: [],
      };

      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);

      // Act
      await personController.getPersonById(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith(mockPerson);
      expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
        where: { id: personId },
        include: { dynamicFields: true, interactions: true },
      });
    });

    it("should return 404 if person not found", async () => {
      // Arrange
      const personId = "non-existent";
      req.params = { id: personId };
      
      mockPrisma.person.findUnique.mockResolvedValue(null);

      // Act
      await personController.getPersonById(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(404);
      expect(resJson).toHaveBeenCalledWith({ error: "Person not found" });
    });
  });

  describe("createPerson", () => {
    it("should create a new person", async () => {
      // Arrange
      const personData = {
        name: "John Doe",
        email: "john@example.com",
        status: PersonStatus.ACTIVE,
      };
      
      req.body = personData;
      
      const now = new Date().toISOString();
      const createdPerson = {
        id: "1",
        ...personData,
        createdAt: now,
        updatedAt: now,
        createdById: "test-user-id",
        dynamicFields: [],
      };

      mockPrisma.person.create.mockResolvedValue(createdPerson);

      // Act
      await personController.createPerson(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(201);
      expect(resJson).toHaveBeenCalledWith(createdPerson);
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: {
          ...personData,
          createdById: "test-user-id",
        },
        include: { dynamicFields: true },
      });
    });

    it("should return 400 for invalid data", async () => {
      // Arrange
      const invalidData = {
        // Missing name
        email: "invalid-email", // Invalid email
      };
      
      req.body = invalidData;
      
      // Mock the service to throw an error
      mockPrisma.person.create.mockImplementation(() => {
        throw new Error("Invalid email format");
      });

      // Act
      await personController.createPerson(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({ error: "Invalid email format" });
    });
  });

  describe("updatePerson", () => {
    it("should update a person", async () => {
      // Arrange
      const personId = "1";
      req.params = { id: personId };
      
      const updateData = {
        name: "John Updated",
        email: "john.updated@example.com",
      };
      
      req.body = updateData;
      
      const now = new Date().toISOString();
      const existingPerson = {
        id: personId,
        name: "John Doe",
        email: "john@example.com",
        status: PersonStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
        dynamicFields: [],
      };

      const updatedPerson = {
        ...existingPerson,
        ...updateData,
        updatedAt: now,
      };

      // First call to findUnique should return the existing person
      // Second call should return the updated person (after the update operation)
      mockPrisma.person.findUnique.mockImplementation((args: any) => {
        // For the first call (checking if person exists)
        if (!mockPrisma.person.update.mock.calls.length) {
          return Promise.resolve(existingPerson);
        }
        // For the second call (after update)
        return Promise.resolve(updatedPerson);
      });
      
      // Mock update to return the updated person
      mockPrisma.person.update.mockResolvedValue(updatedPerson);

      // Act
      await personController.updatePerson(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith(updatedPerson);
      expect(mockPrisma.person.update).toHaveBeenCalledWith({
        where: { id: personId },
        data: expect.objectContaining(updateData),
        include: { dynamicFields: true },
      });
    });

    it("should return 404 if person not found", async () => {
      // Arrange
      const personId = "non-existent";
      req.params = { id: personId };
      
      const updateData = {
        name: "John Updated",
      };
      
      req.body = updateData;
      
      mockPrisma.person.findUnique.mockResolvedValue(null);
      
      // Mock the service to throw an error
      mockPrisma.person.update.mockImplementation(() => {
        throw new Error(`Person with ID ${personId} not found`);
      });

      // Act
      await personController.updatePerson(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(404);
      expect(resJson).toHaveBeenCalledWith({
        error: `Person with ID ${personId} not found`,
      });
    });
  });

  describe("deletePerson", () => {
    it("should delete a person", async () => {
      // Arrange
      const personId = "1";
      req.params = { id: personId };
      
      const existingPerson = {
        id: personId,
        name: "John Doe",
      };

      mockPrisma.person.findUnique.mockResolvedValue(existingPerson);
      mockPrisma.person.delete.mockResolvedValue(existingPerson);

      // Act
      await personController.deletePerson(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        message: "Person deleted successfully"
      });
      expect(mockPrisma.person.delete).toHaveBeenCalledWith({
        where: { id: personId },
      });
    });

    it("should return 404 if person not found", async () => {
      // Arrange
      const personId = "non-existent";
      req.params = { id: personId };
      
      mockPrisma.person.findUnique.mockResolvedValue(null);
      
      // Act
      await personController.deletePerson(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(404);
      expect(resJson).toHaveBeenCalledWith({
        error: `Person with ID ${personId} not found`,
      });
    });
  });

  describe("addDynamicField", () => {
    it("should add a dynamic field to a person", async () => {
      // Arrange
      const personId = "1";
      req.params = { personId };
      
      const fieldData = {
        fieldName: "Company",
        fieldType: FieldType.STRING,
        stringValue: "Acme Inc",
      };
      
      req.body = fieldData;
      
      const existingPerson = {
        id: personId,
        name: "John Doe",
      };

      const now = new Date().toISOString();
      const createdField = {
        id: "df1",
        ...fieldData,
        personId,
        createdAt: now,
        updatedAt: now,
      };

      mockPrisma.person.findUnique.mockResolvedValue(existingPerson);
      mockPrisma.dynamicField.create.mockResolvedValue(createdField);

      // Act
      await personController.addDynamicField(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(201);
      expect(resJson).toHaveBeenCalledWith(createdField);
      expect(mockPrisma.dynamicField.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...fieldData,
          personId,
        }),
      });
    });

    it("should return 400 for invalid field type", async () => {
      // Arrange
      const personId = "1";
      req.params = { personId };
      
      const fieldData = {
        fieldName: "Company",
        fieldType: "INVALID_TYPE", // Invalid field type
        stringValue: "Acme Inc",
      };
      
      req.body = fieldData;

      // Act
      await personController.addDynamicField(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({ error: "Invalid field type" });
    });

    it("should return 404 if person not found", async () => {
      // Arrange
      const personId = "non-existent";
      req.params = { personId };
      
      const fieldData = {
        fieldName: "Company",
        fieldType: FieldType.STRING,
        stringValue: "Acme Inc",
      };
      
      req.body = fieldData;
      
      mockPrisma.person.findUnique.mockResolvedValue(null);

      // Act
      await personController.addDynamicField(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(404);
      expect(resJson).toHaveBeenCalledWith({
        error: `Person with ID ${personId} not found`,
      });
    });
  });

  describe("removeDynamicField", () => {
    it("should remove a dynamic field", async () => {
      // Arrange
      const fieldId = "df1";
      req.params = { fieldId };
      
      const existingField = {
        id: fieldId,
        fieldName: "Company",
        fieldType: FieldType.STRING,
        stringValue: "Acme Inc",
      };

      mockPrisma.dynamicField.findUnique.mockResolvedValue(existingField);
      mockPrisma.dynamicField.delete.mockResolvedValue(existingField);

      // Act
      await personController.removeDynamicField(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        message: "Dynamic field removed successfully"
      });
      expect(mockPrisma.dynamicField.delete).toHaveBeenCalledWith({
        where: { id: fieldId },
      });
    });

    it("should return 404 if field not found", async () => {
      // Arrange
      const fieldId = "non-existent";
      req.params = { fieldId };
      
      mockPrisma.dynamicField.findUnique.mockResolvedValue(null);

      // Act
      await personController.removeDynamicField(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(404);
      expect(resJson).toHaveBeenCalledWith({
        error: `Dynamic field with ID ${fieldId} not found`,
      });
    });
  });
});
