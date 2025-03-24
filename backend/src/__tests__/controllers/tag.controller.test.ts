/**
 * Tag Controller Tests
 * 
 * This file contains tests for the tag controller.
 */

import { Request, Response } from 'express';
import tagController from '../../controllers/tag/tag.controller';
import { mockPrisma, setupPrismaMock } from '../mocks/prisma.mock';

// Initialize Prisma mock
setupPrismaMock();

describe('Tag Controller', () => {
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

  describe('createTag', () => {
    it('should create a tag successfully', async () => {
      // Arrange
      const tagData = {
        name: 'Test Tag',
        color: '#FF5733',
        description: 'A test tag',
      };
      
      const createdTag = {
        id: 'tag-id',
        ...tagData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      req.body = tagData;
      
      mockPrisma.tag.create.mockResolvedValue(createdTag);
      
      // Act
      await tagController.createTag(req as Request, res as Response);
      
      // Assert
      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: tagData
      });
      expect(resStatus).toHaveBeenCalledWith(201);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        data: createdTag,
      });
    });
    
    it('should handle errors when creating a tag', async () => {
      // Arrange
      req.body = {
        name: 'Test Tag',
      };
      
      mockPrisma.tag.create.mockRejectedValue(new Error('Failed to create tag'));
      
      // Act
      await tagController.createTag(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create tag'
      });
    });
  });

  describe('getTagById', () => {
    it('should get a tag by ID', async () => {
      // Arrange
      const tagId = 'tag-id';
      const tag = {
        id: tagId,
        name: 'Test Tag',
        color: '#FF5733',
        description: 'A test tag',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      req.params = { id: tagId };
      
      mockPrisma.tag.findUnique.mockResolvedValue(tag);
      
      // Act
      await tagController.getTagById(req as Request, res as Response);
      
      // Assert
      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: tagId }
      });
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        data: tag,
      });
    });
    
    it('should return 404 if tag is not found', async () => {
      // Arrange
      const tagId = 'non-existent-id';
      
      req.params = { id: tagId };
      
      mockPrisma.tag.findUnique.mockResolvedValue(null);
      
      // Act
      await tagController.getTagById(req as Request, res as Response);
      
      // Assert
      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: tagId }
      });
      expect(resStatus).toHaveBeenCalledWith(404);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: `Tag with ID ${tagId} not found`,
      });
    });
    
    it('should handle errors when getting a tag', async () => {
      // Arrange
      const tagId = 'tag-id';
      req.params = { id: tagId };
      
      mockPrisma.tag.findUnique.mockRejectedValue(new Error('Failed to fetch tag'));
      
      // Act
      await tagController.getTagById(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(500);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch tag'
      });
    });
  });

  describe('getTags', () => {
    it('should get all tags with pagination', async () => {
      // Arrange
      const tags = [
        {
          id: 'tag-id-1',
          name: 'Test Tag 1',
          color: '#FF5733',
          description: 'A test tag',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tag-id-2',
          name: 'Test Tag 2',
          color: '#33FF57',
          description: 'Another test tag',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      const total = 15;
      
      req.query = {
        search: 'test',
        page: '2',
        limit: '10',
      };
      
      mockPrisma.tag.findMany.mockResolvedValue(tags);
      mockPrisma.tag.count.mockResolvedValue(total);
      
      // Act
      await tagController.getTags(req as Request, res as Response);
      
      // Assert
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } }
            ])
          }),
          skip: 10,
          take: 10
        })
      );
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        data: tags,
        meta: {
          total,
          page: 2,
          limit: 10,
          pages: 2,
        },
      });
    });
    
    it('should handle errors when getting tags', async () => {
      // Arrange
      req.query = {};
      
      mockPrisma.tag.findMany.mockRejectedValue(new Error('Failed to fetch tags'));
      
      // Act
      await tagController.getTags(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(500);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch tags'
      });
    });
  });

  describe('updateTag', () => {
    it('should update a tag successfully', async () => {
      // Arrange
      const tagId = 'tag-id';
      const updateData = {
        name: 'Updated Tag',
        color: '#3357FF',
        description: 'Updated description',
      };
      
      const updatedTag = {
        id: tagId,
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      req.params = { id: tagId };
      req.body = updateData;
      
      mockPrisma.tag.findUnique.mockResolvedValue({ id: tagId });
      mockPrisma.tag.update.mockResolvedValue(updatedTag);
      
      // Act
      await tagController.updateTag(req as Request, res as Response);
      
      // Assert
      expect(mockPrisma.tag.update).toHaveBeenCalledWith({
        where: { id: tagId },
        data: expect.objectContaining(updateData)
      });
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        data: updatedTag,
      });
    });
    
    it('should handle errors when updating a tag', async () => {
      // Arrange
      const tagId = 'tag-id';
      req.params = { id: tagId };
      req.body = { name: 'Updated Tag' };
      
      mockPrisma.tag.findUnique.mockResolvedValue(null);
      mockPrisma.tag.update.mockRejectedValue(new Error('Tag with ID tag-id not found'));
      
      // Act
      await tagController.updateTag(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'Tag with ID tag-id not found',
      });
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag successfully', async () => {
      // Arrange
      const tagId = 'tag-id';
      const deletedTag = {
        id: tagId,
        name: 'Test Tag'
      };
      
      req.params = { id: tagId };
      
      mockPrisma.tag.findUnique.mockResolvedValue({ id: tagId });
      mockPrisma.tag.delete.mockResolvedValue(deletedTag);
      
      // Act
      await tagController.deleteTag(req as Request, res as Response);
      
      // Assert
      expect(mockPrisma.tag.delete).toHaveBeenCalledWith({
        where: { id: tagId }
      });
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        message: 'Tag deleted successfully'
      });
    });
    
    it('should handle errors when deleting a tag', async () => {
      // Arrange
      const tagId = 'tag-id';
      req.params = { id: tagId };
      
      mockPrisma.tag.findUnique.mockResolvedValue(null);
      mockPrisma.tag.delete.mockRejectedValue(new Error('Tag with ID tag-id not found'));
      
      // Act
      await tagController.deleteTag(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'Tag with ID tag-id not found',
      });
    });
  });

  describe('getTagsForInteraction', () => {
    it('should get all tags for an interaction', async () => {
      // Arrange
      const interactionId = 'interaction-id';
      const tagRelations = [
        {
          tag: {
            id: 'tag-id-1',
            name: 'Test Tag 1',
            color: '#FF5733',
            description: 'A test tag',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        },
        {
          tag: {
            id: 'tag-id-2',
            name: 'Test Tag 2',
            color: '#33FF57',
            description: 'Another test tag',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
      ];
      
      req.params = { interactionId };
      
      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      mockPrisma.interactionTag.findMany.mockResolvedValue(tagRelations);
      
      // Act
      await tagController.getTagsForInteraction(req as Request, res as Response);
      
      // Assert
      expect(mockPrisma.interactionTag.findMany).toHaveBeenCalledWith({
        where: { interactionId },
        include: { tag: true }
      });
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        data: tagRelations.map(relation => relation.tag),
      });
    });
    
    it('should handle errors when getting tags for an interaction', async () => {
      // Arrange
      const interactionId = 'interaction-id';
      req.params = { interactionId };
      
      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      mockPrisma.interactionTag.findMany.mockRejectedValue(new Error('Failed to fetch tags for interaction'));
      
      // Act
      await tagController.getTagsForInteraction(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(500);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch tags for interaction',
      });
    });
  });

  describe('associateTagsWithInteraction', () => {
    it('should associate tags with an interaction', async () => {
      // Arrange
      const interactionId = 'interaction-id';
      const tagIds = ['tag-id-1', 'tag-id-2'];
      const tagRelations = [
        {
          tag: {
            id: 'tag-id-1',
            name: 'Test Tag 1',
            color: '#FF5733',
            description: 'A test tag',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        },
        {
          tag: {
            id: 'tag-id-2',
            name: 'Test Tag 2',
            color: '#33FF57',
            description: 'Another test tag',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
      ];
      
      req.params = { interactionId };
      req.body = { tagIds };
      
      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      mockPrisma.interactionTag.create.mockResolvedValue({});
      mockPrisma.interactionTag.findMany.mockResolvedValue(tagRelations);
      
      // Act
      await tagController.associateTagsWithInteraction(req as Request, res as Response);
      
      // Assert
      expect(mockPrisma.interactionTag.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.interactionTag.findMany).toHaveBeenCalledWith({
        where: { interactionId },
        include: { tag: true }
      });
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        data: tagRelations.map(relation => relation.tag)
      });
    });
    
    it('should return 400 if tagIds is not an array', async () => {
      // Arrange
      const interactionId = 'interaction-id';
      req.params = { interactionId };
      req.body = { tagIds: 'not-an-array' };
      
      // Act
      await tagController.associateTagsWithInteraction(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'tagIds must be an array of tag IDs',
      });
    });
    
    it('should handle errors when associating tags with an interaction', async () => {
      // Arrange
      const interactionId = 'interaction-id';
      req.params = { interactionId };
      req.body = { tagIds: ['tag-id-1'] };
      
      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      mockPrisma.interactionTag.create.mockRejectedValue(new Error('Failed to associate tags with interaction'));
      
      // Act
      await tagController.associateTagsWithInteraction(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to associate tags with interaction',
      });
    });
  });

  describe('removeTagsFromInteraction', () => {
    it('should remove tags from an interaction', async () => {
      // Arrange
      const interactionId = 'interaction-id';
      const tagIds = ['tag-id-1', 'tag-id-2'];
      const remainingTagRelations = [
        {
          tag: {
            id: 'tag-id-3',
            name: 'Test Tag 3',
            color: '#5733FF',
            description: 'A remaining tag',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }
      ];
      
      req.params = { interactionId };
      req.body = { tagIds };
      
      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      mockPrisma.interactionTag.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.interactionTag.findMany.mockResolvedValue(remainingTagRelations);
      
      // Act
      await tagController.removeTagsFromInteraction(req as Request, res as Response);
      
      // Assert
      expect(mockPrisma.interactionTag.deleteMany).toHaveBeenCalledWith({
        where: {
          interactionId,
          tagId: {
            in: tagIds
          }
        }
      });
      expect(mockPrisma.interactionTag.findMany).toHaveBeenCalledWith({
        where: { interactionId },
        include: { tag: true }
      });
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith({
        success: true,
        data: remainingTagRelations.map(relation => relation.tag)
      });
    });
    
    it('should return 400 if tagIds is not an array', async () => {
      // Arrange
      const interactionId = 'interaction-id';
      req.params = { interactionId };
      req.body = { tagIds: 'not-an-array' };
      
      // Act
      await tagController.removeTagsFromInteraction(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'tagIds must be an array of tag IDs',
      });
    });
    
    it('should handle errors when removing tags from an interaction', async () => {
      // Arrange
      const interactionId = 'interaction-id';
      req.params = { interactionId };
      req.body = { tagIds: ['tag-id-1'] };
      
      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: interactionId });
      mockPrisma.interactionTag.deleteMany.mockRejectedValue(new Error('Failed to remove tags from interaction'));
      
      // Act
      await tagController.removeTagsFromInteraction(req as Request, res as Response);
      
      // Assert
      expect(resStatus).toHaveBeenCalledWith(400);
      expect(resJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to remove tags from interaction',
      });
    });
  });
});
