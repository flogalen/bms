import { Request, Response } from "express";
import interactionController from "../../controllers/interaction/interaction.controller";
import { InteractionType } from "../../services/interaction.service";
import { mockPrisma, setupPrismaMock } from "../mocks/prisma.mock";

// Initialize Prisma mock
setupPrismaMock();

describe("Interaction Controller", () => {
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

  describe("createInteraction", () => {
    it("should create a new interaction", async () => {
      // Arrange
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const interactionData = {
        type: InteractionType.CALL,
        notes: "Discussed project timeline",
        date: mockDate.toISOString(),
        tagIds: ["tag-1", "tag-2"],
        personId: "person-id-1"
      };
      
      req.body = interactionData;
      
      const createdInteraction = {
        id: "interaction-id-1",
        type: InteractionType.CALL,
        notes: "Discussed project timeline",
        date: mockDate,
        personId: "person-id-1",
        createdById: "test-user-id",
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: "person-id-1", name: "John Doe" },
        createdBy: { id: "test-user-id", name: "Test User" },
        tagRelations: [
          { tag: { id: "tag-1", name: "important" } },
          { tag: { id: "tag-2", name: "follow-up" } }
        ]
      };

      // Mock the service to create an interaction
      mockPrisma.interactionLog.create.mockResolvedValue(createdInteraction);
      
      // Mock the tag service to associate tags with interaction
      mockPrisma.interactionTag.create.mockResolvedValue({});

      // Act
      await interactionController.createInteraction(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalled();
      expect(resJson).toHaveBeenCalled();
      expect(mockPrisma.interactionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: interactionData.type,
            notes: interactionData.notes,
            person: {
              connect: { id: interactionData.personId }
            },
            createdBy: {
              connect: { id: "test-user-id" }
            }
          })
        })
      );
    });

    it("should return 400 if required fields are missing", async () => {
      // Arrange
      const invalidData = {
        // Missing type
        notes: "Discussed project timeline",
        personId: "person-id-1"
      };
      
      req.body = invalidData;
      
      // Mock the service to throw an error
      mockPrisma.interactionLog.create.mockImplementation(() => {
        throw new Error("Interaction type is required");
      });

      // Act
      await interactionController.createInteraction(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: "Interaction type is required"
      });
    });
  });

  describe("getInteractionById", () => {
    it("should return an interaction by ID", async () => {
      // Arrange
      const interactionId = "interaction-id-1";
      req.params = { id: interactionId };
      
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const mockInteraction = {
        id: interactionId,
        type: InteractionType.CALL,
        notes: "Discussed project timeline",
        date: mockDate,
        personId: "person-id-1",
        createdById: "test-user-id",
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: "person-id-1", name: "John Doe" },
        createdBy: { id: "test-user-id", name: "Test User" }
      };

      mockPrisma.interactionLog.findUnique.mockResolvedValue(mockInteraction);

      // Act
      await interactionController.getInteractionById(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        data: mockInteraction
      });
      expect(mockPrisma.interactionLog.findUnique).toHaveBeenCalledWith({
        where: { id: interactionId },
        include: {
          person: true,
          createdBy: true
        }
      });
    });

    it("should return 404 if interaction is not found", async () => {
      // Arrange
      const interactionId = "non-existent-id";
      req.params = { id: interactionId };
      
      mockPrisma.interactionLog.findUnique.mockResolvedValue(null);

      // Act
      await interactionController.getInteractionById(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(404);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: `Interaction with ID ${interactionId} not found`
      });
    });
  });

  describe("getInteractions", () => {
    it("should return a list of interactions", async () => {
      // Arrange
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const mockInteractions = [
        {
          id: "interaction-id-1",
          type: InteractionType.CALL,
          notes: "Discussed project timeline",
          date: mockDate,
          personId: "person-id-1",
          createdById: "test-user-id",
          createdAt: mockDate,
          updatedAt: mockDate,
          person: { id: "person-id-1", name: "John Doe" },
          createdBy: { id: "test-user-id", name: "Test User" },
          tagRelations: [
            { tag: { id: "tag-1", name: "important" } },
            { tag: { id: "tag-2", name: "follow-up" } }
          ],
          structuredTags: [
            { id: "tag-1", name: "important", color: "blue", description: "Important tag" },
            { id: "tag-2", name: "follow-up", color: "red", description: "Follow-up tag" }
          ]
        }
      ];

      mockPrisma.interactionLog.findMany.mockResolvedValue(mockInteractions);
      mockPrisma.interactionLog.count.mockResolvedValue(1);

      // Act
      await interactionController.getInteractions(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalled();
      expect(resJson).toHaveBeenCalled();
    });

    it("should filter interactions by type", async () => {
      // Arrange
      req.query = { type: InteractionType.CALL };
      
      mockPrisma.interactionLog.findMany.mockResolvedValue([]);
      mockPrisma.interactionLog.count.mockResolvedValue(0);

      // Act
      await interactionController.getInteractions(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(mockPrisma.interactionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: InteractionType.CALL
          })
        })
      );
    });

    it("should filter interactions by date range", async () => {
      // Arrange
      const startDate = '2025-03-01T00:00:00.000Z';
      const endDate = '2025-03-31T23:59:59.999Z';
      req.query = { startDate, endDate };
      
      mockPrisma.interactionLog.findMany.mockResolvedValue([]);
      mockPrisma.interactionLog.count.mockResolvedValue(0);

      // Act
      await interactionController.getInteractions(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(mockPrisma.interactionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          })
        })
      );
    });
  });

  describe("getInteractionsByPerson", () => {
    it("should return interactions for a specific person", async () => {
      // Arrange
      const personId = "person-id-1";
      req.params = { personId };
      
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const mockInteractions = [
        {
          id: "interaction-id-1",
          type: InteractionType.CALL,
          notes: "Discussed project timeline",
          date: mockDate,
          personId: personId,
          createdById: "test-user-id",
          createdAt: mockDate,
          updatedAt: mockDate,
          person: { id: personId, name: "John Doe" },
          createdBy: { id: "test-user-id", name: "Test User" },
          tagRelations: [],
          structuredTags: []
        }
      ];

      mockPrisma.interactionLog.findMany.mockResolvedValue(mockInteractions);
      mockPrisma.interactionLog.count.mockResolvedValue(1);

      // Act
      await interactionController.getInteractionsByPerson(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        data: mockInteractions,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1
        }
      });
      expect(mockPrisma.interactionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            personId
          })
        })
      );
    });
  });

  describe("updateInteraction", () => {
    it("should update an interaction", async () => {
      // Arrange
      const interactionId = "interaction-id-1";
      req.params = { id: interactionId };
      
      const updateData = {
        notes: "Updated notes",
        tagIds: ["tag-1", "tag-3"]
      };
      
      req.body = updateData;
      
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const updatedInteraction = {
        id: interactionId,
        type: InteractionType.CALL,
        notes: "Updated notes",
        date: mockDate,
        personId: "person-id-1",
        createdById: "test-user-id",
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: "person-id-1", name: "John Doe" },
        createdBy: { id: "test-user-id", name: "Test User" },
        tagRelations: [
          { tag: { id: "tag-1", name: "important" } },
          { tag: { id: "tag-3", name: "updated" } }
        ],
        structuredTags: [
          { id: "tag-1", name: "important", color: "blue", description: "Important tag" },
          { id: "tag-3", name: "updated", color: "green", description: "Updated tag" }
        ]
      };

      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      mockPrisma.interactionLog.update.mockResolvedValue(updatedInteraction);
      
      // Mock the tag service operations
      mockPrisma.interactionTag.deleteMany.mockResolvedValue({});
      mockPrisma.interactionTag.create.mockResolvedValue({});

      // Act
      await interactionController.updateInteraction(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalled();
      expect(resJson).toHaveBeenCalled();
      expect(mockPrisma.interactionLog.update).toHaveBeenCalledWith({
        where: { id: interactionId },
        data: expect.objectContaining({
          notes: updateData.notes
        }),
        include: expect.any(Object)
      });
    });

    it("should return 400 if update fails", async () => {
      // Arrange
      const interactionId = "non-existent-id";
      req.params = { id: interactionId };
      
      const updateData = {
        notes: "Updated notes"
      };
      
      req.body = updateData;
      
      // Mock the service to throw an error
      mockPrisma.interactionLog.update.mockImplementation(() => {
        throw new Error(`Interaction log with ID ${interactionId} not found`);
      });

      // Act
      await interactionController.updateInteraction(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: `Interaction log with ID ${interactionId} not found`
      });
    });
  });

  describe("deleteInteraction", () => {
    it("should delete an interaction", async () => {
      // Arrange
      const interactionId = "interaction-id-1";
      req.params = { id: interactionId };
      
      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      mockPrisma.interactionLog.delete.mockResolvedValue({ id: interactionId });

      // Act
      await interactionController.deleteInteraction(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        message: "Interaction log deleted successfully"
      });
      expect(mockPrisma.interactionLog.delete).toHaveBeenCalledWith({
        where: { id: interactionId }
      });
    });

    it("should return 400 if delete fails", async () => {
      // Arrange
      const interactionId = "non-existent-id";
      req.params = { id: interactionId };
      
      // Mock the service to throw an error
      mockPrisma.interactionLog.delete.mockImplementation(() => {
        throw new Error(`Interaction log with ID ${interactionId} not found`);
      });

      // Act
      await interactionController.deleteInteraction(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: `Interaction log with ID ${interactionId} not found`
      });
    });
  });

  describe("addTagsById", () => {
    it("should add tags to an interaction", async () => {
      // Arrange
      const interactionId = "interaction-id-1";
      req.params = { id: interactionId };
      
      const tagIds = ["tag-1", "tag-3"];
      req.body = { tagIds };
      
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const updatedInteraction = {
        id: interactionId,
        type: InteractionType.CALL,
        notes: "Discussed project timeline",
        date: mockDate,
        personId: "person-id-1",
        createdById: "test-user-id",
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: "person-id-1", name: "John Doe" },
        createdBy: { id: "test-user-id", name: "Test User" },
        tagRelations: [
          { tag: { id: "tag-1", name: "important" } },
          { tag: { id: "tag-2", name: "follow-up" } },
          { tag: { id: "tag-3", name: "new-tag" } }
        ],
        structuredTags: [
          { id: "tag-1", name: "important", color: "blue", description: "Important tag" },
          { id: "tag-2", name: "follow-up", color: "red", description: "Follow-up tag" },
          { id: "tag-3", name: "new-tag", color: "green", description: "New tag" }
        ]
      };

      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      
      // Mock the tag service operations
      mockPrisma.interactionTag.create.mockResolvedValue({});
      
      // Mock the service to return the updated interaction
      mockPrisma.interactionLog.findUnique.mockImplementation((args: any) => {
        if (args.include && args.include.tagRelations) {
          return updatedInteraction;
        }
        return { id: interactionId };
      });

      // Act
      await interactionController.addTagsById(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalled();
    });

    it("should return 400 if tagIds is not an array", async () => {
      // Arrange
      const interactionId = "interaction-id-1";
      req.params = { id: interactionId };
      
      req.body = { tagIds: "not-an-array" };

      // Act
      await interactionController.addTagsById(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: "tagIds must be an array of tag IDs"
      });
    });
  });

  describe("removeTagsById", () => {
    it("should remove tags from an interaction", async () => {
      // Arrange
      const interactionId = "interaction-id-1";
      req.params = { id: interactionId };
      
      const tagIds = ["tag-2"];
      req.body = { tagIds };
      
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const updatedInteraction = {
        id: interactionId,
        type: InteractionType.CALL,
        notes: "Discussed project timeline",
        date: mockDate,
        personId: "person-id-1",
        createdById: "test-user-id",
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: "person-id-1", name: "John Doe" },
        createdBy: { id: "test-user-id", name: "Test User" },
        tagRelations: [
          { tag: { id: "tag-1", name: "important" } }
        ],
        structuredTags: [
          { id: "tag-1", name: "important", color: "blue", description: "Important tag" }
        ]
      };

      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      
      // Mock the tag service operations
      mockPrisma.interactionTag.deleteMany.mockResolvedValue({});
      
      // Mock the service to return the updated interaction
      mockPrisma.interactionLog.findUnique.mockImplementation((args: any) => {
        if (args.include && args.include.tagRelations) {
          return updatedInteraction;
        }
        return { id: interactionId };
      });

      // Act
      await interactionController.removeTagsById(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalled();
    });

    it("should return 400 if tagIds is not an array", async () => {
      // Arrange
      const interactionId = "interaction-id-1";
      req.params = { id: interactionId };
      
      req.body = { tagIds: "not-an-array" };

      // Act
      await interactionController.removeTagsById(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: "tagIds must be an array of tag IDs"
      });
    });
  });

  describe("getAllTags", () => {
    it("should return all unique tags", async () => {
      // Arrange
      const mockTags = [
        { id: "tag-1", name: "important", color: "blue", description: "Important tag" },
        { id: "tag-2", name: "follow-up", color: "red", description: "Follow-up tag" },
        { id: "tag-3", name: "new-tag", color: "green", description: "New tag" }
      ];

      // Mock the tag service to return tags
      mockPrisma.tag.findMany.mockResolvedValue(mockTags);

      // Act
      await interactionController.getAllTags(req as Request, res as Response);

      // Assert
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalled();
    });
  });
});
