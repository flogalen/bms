/**
 * Tag Service Tests
 * 
 * This file contains tests for the tag service.
 */

import { PrismaClient } from '@prisma/client';
import tagService, { Tag, CreateTagInput, UpdateTagInput } from '../../services/tag.service';

import { mockPrisma, setupPrismaMock } from '../mocks/prisma.mock';

// Set up global prisma mock for tests
(global as any).prisma = mockPrisma;
setupPrismaMock();

describe('Tag Service', () => {
  beforeEach(() => {
    setupPrismaMock();
    jest.clearAllMocks();
  });

  describe('createTag', () => {
    it('should create a tag successfully', async () => {
      const tagData: CreateTagInput = {
        name: 'Test Tag',
        color: '#FF5733',
        description: 'A test tag',
      };

      const expectedTag: Tag = {
        id: 'tag-id',
        name: 'Test Tag',
        color: '#FF5733',
        description: 'A test tag',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.tag.create as jest.Mock).mockResolvedValue(expectedTag);

      const result = await tagService.createTag(tagData);

      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: tagData,
      });
      expect(result).toEqual(expectedTag);
    });

    it('should throw an error if tag name is not provided', async () => {
      const tagData: CreateTagInput = {
        name: '',
        color: '#FF5733',
      };

      await expect(tagService.createTag(tagData)).rejects.toThrow('Tag name is required');
    });

    it('should throw an error if color format is invalid', async () => {
      const tagData: CreateTagInput = {
        name: 'Test Tag',
        color: 'invalid-color',
      };

      await expect(tagService.createTag(tagData)).rejects.toThrow('Invalid color format');
    });
  });

  describe('getTagById', () => {
    it('should get a tag by ID', async () => {
      const tagId = 'tag-id';
      const expectedTag: Tag = {
        id: tagId,
        name: 'Test Tag',
        color: '#FF5733',
        description: 'A test tag',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.tag.findUnique as jest.Mock).mockResolvedValue(expectedTag);

      const result = await tagService.getTagById(tagId);

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: tagId },
      });
      expect(result).toEqual(expectedTag);
    });

    it('should return null if tag is not found', async () => {
      const tagId = 'non-existent-id';

      (mockPrisma.tag.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tagService.getTagById(tagId);

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: tagId },
      });
      expect(result).toBeNull();
    });
  });

  describe('getTagByName', () => {
    it('should get a tag by name', async () => {
      const tagName = 'Test Tag';
      const expectedTag: Tag = {
        id: 'tag-id',
        name: tagName,
        color: '#FF5733',
        description: 'A test tag',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.tag.findUnique as jest.Mock).mockResolvedValue(expectedTag);

      const result = await tagService.getTagByName(tagName);

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { name: tagName },
      });
      expect(result).toEqual(expectedTag);
    });

    it('should return null if tag is not found', async () => {
      const tagName = 'Non-existent Tag';

      (mockPrisma.tag.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tagService.getTagByName(tagName);

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { name: tagName },
      });
      expect(result).toBeNull();
    });
  });

  describe('getTags', () => {
    it('should get all tags with pagination', async () => {
      const filters = { search: 'test' };
      const pagination = { page: 2, limit: 10 };
      const expectedTags: Tag[] = [
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
      const expectedTotal = 15;

      (mockPrisma.tag.count as jest.Mock).mockResolvedValue(expectedTotal);
      (mockPrisma.tag.findMany as jest.Mock).mockResolvedValue(expectedTags);

      const result = await tagService.getTags(filters, pagination);

      expect(mockPrisma.tag.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
        },
      });
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        skip: 10,
        take: 10,
        orderBy: {
          name: 'asc',
        },
      });
      expect(result).toEqual({
        tags: expectedTags,
        total: expectedTotal,
      });
    });

    it('should use default pagination if not provided', async () => {
      const expectedTags: Tag[] = [
        {
          id: 'tag-id-1',
          name: 'Test Tag 1',
          color: '#FF5733',
          description: 'A test tag',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const expectedTotal = 1;

      (mockPrisma.tag.count as jest.Mock).mockResolvedValue(expectedTotal);
      (mockPrisma.tag.findMany as jest.Mock).mockResolvedValue(expectedTags);

      const result = await tagService.getTags();

      expect(mockPrisma.tag.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 50,
        orderBy: {
          name: 'asc',
        },
      });
      expect(result).toEqual({
        tags: expectedTags,
        total: expectedTotal,
      });
    });
  });

  describe('updateTag', () => {
    it('should update a tag successfully', async () => {
      const tagId = 'tag-id';
      const updateData: UpdateTagInput = {
        name: 'Updated Tag',
        color: '#3357FF',
        description: 'Updated description',
      };
      const existingTag: Tag = {
        id: tagId,
        name: 'Test Tag',
        color: '#FF5733',
        description: 'A test tag',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const expectedTag: Tag = {
        ...existingTag,
        ...updateData,
        updatedAt: new Date(),
      };

      (mockPrisma.tag.findUnique as jest.Mock).mockResolvedValue(existingTag);
      (mockPrisma.tag.update as jest.Mock).mockResolvedValue(expectedTag);

      const result = await tagService.updateTag(tagId, updateData);

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: tagId },
      });
      expect(mockPrisma.tag.update).toHaveBeenCalledWith({
        where: { id: tagId },
        data: {
          ...updateData,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(expectedTag);
    });

    it('should throw an error if tag is not found', async () => {
      const tagId = 'non-existent-id';
      const updateData: UpdateTagInput = {
        name: 'Updated Tag',
      };

      (mockPrisma.tag.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(tagService.updateTag(tagId, updateData)).rejects.toThrow(
        `Tag with ID ${tagId} not found`
      );
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag successfully', async () => {
      const tagId = 'tag-id';
      const existingTag: Tag = {
        id: tagId,
        name: 'Test Tag',
        color: '#FF5733',
        description: 'A test tag',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.tag.findUnique as jest.Mock).mockResolvedValue(existingTag);
      (mockPrisma.tag.delete as jest.Mock).mockResolvedValue(existingTag);

      const result = await tagService.deleteTag(tagId);

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: tagId },
      });
      expect(mockPrisma.tag.delete).toHaveBeenCalledWith({
        where: { id: tagId },
      });
      expect(result).toEqual({
        success: true,
        message: 'Tag deleted successfully',
      });
    });

    it('should throw an error if tag is not found', async () => {
      const tagId = 'non-existent-id';

      (mockPrisma.tag.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(tagService.deleteTag(tagId)).rejects.toThrow(
        `Tag with ID ${tagId} not found`
      );
    });
  });

  describe('associateTagsWithInteraction', () => {
    it('should associate tags with an interaction', async () => {
      const interactionId = 'interaction-id';
      const tagIds = ['tag-id-1', 'tag-id-2'];
      const interaction = {
        id: interactionId,
        type: 'CALL',
        date: new Date(),
        tags: [],
      };

      (mockPrisma.interactionLog.findUnique as jest.Mock).mockResolvedValue(interaction);
      (mockPrisma.interactionTag.create as jest.Mock).mockResolvedValue({});

      await tagService.associateTagsWithInteraction(interactionId, tagIds);

      expect(mockPrisma.interactionLog.findUnique).toHaveBeenCalledWith({
        where: { id: interactionId },
      });
      expect(mockPrisma.interactionTag.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.interactionTag.create).toHaveBeenCalledWith({
        data: {
          interactionId,
          tagId: tagIds[0],
        },
      });
      expect(mockPrisma.interactionTag.create).toHaveBeenCalledWith({
        data: {
          interactionId,
          tagId: tagIds[1],
        },
      });
    });

    it('should throw an error if interaction is not found', async () => {
      const interactionId = 'non-existent-id';
      const tagIds = ['tag-id-1'];

      (mockPrisma.interactionLog.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(tagService.associateTagsWithInteraction(interactionId, tagIds)).rejects.toThrow(
        `Interaction with ID ${interactionId} not found`
      );
    });
  });

  describe('removeTagsFromInteraction', () => {
    it('should remove tag associations from an interaction', async () => {
      const interactionId = 'interaction-id';
      const tagIds = ['tag-id-1', 'tag-id-2'];
      const interaction = {
        id: interactionId,
        type: 'CALL',
        date: new Date(),
        tags: [],
      };

      (mockPrisma.interactionLog.findUnique as jest.Mock).mockResolvedValue(interaction);
      (mockPrisma.interactionTag.deleteMany as jest.Mock).mockResolvedValue({});

      await tagService.removeTagsFromInteraction(interactionId, tagIds);

      expect(mockPrisma.interactionLog.findUnique).toHaveBeenCalledWith({
        where: { id: interactionId },
      });
      expect(mockPrisma.interactionTag.deleteMany).toHaveBeenCalledWith({
        where: {
          interactionId,
          tagId: {
            in: tagIds,
          },
        },
      });
    });

    it('should throw an error if interaction is not found', async () => {
      const interactionId = 'non-existent-id';
      const tagIds = ['tag-id-1'];

      (mockPrisma.interactionLog.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(tagService.removeTagsFromInteraction(interactionId, tagIds)).rejects.toThrow(
        `Interaction with ID ${interactionId} not found`
      );
    });
  });

  describe('getTagsForInteraction', () => {
    it('should get all tags for an interaction', async () => {
      const interactionId = 'interaction-id';
      const interaction = {
        id: interactionId,
        type: 'CALL',
        date: new Date(),
        tags: [],
      };
      const tagRelations = [
        {
          tag: {
            id: 'tag-id-1',
            name: 'Test Tag 1',
            color: '#FF5733',
            description: 'A test tag',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          tag: {
            id: 'tag-id-2',
            name: 'Test Tag 2',
            color: '#33FF57',
            description: 'Another test tag',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];
      const expectedTags = tagRelations.map(relation => relation.tag);

      (mockPrisma.interactionLog.findUnique as jest.Mock).mockResolvedValue(interaction);
      (mockPrisma.interactionTag.findMany as jest.Mock).mockResolvedValue(tagRelations);

      const result = await tagService.getTagsForInteraction(interactionId);

      expect(mockPrisma.interactionLog.findUnique).toHaveBeenCalledWith({
        where: { id: interactionId },
      });
      expect(mockPrisma.interactionTag.findMany).toHaveBeenCalledWith({
        where: { interactionId },
        include: { tag: true },
      });
      expect(result).toEqual(expectedTags);
    });

    it('should throw an error if interaction is not found', async () => {
      const interactionId = 'non-existent-id';

      (mockPrisma.interactionLog.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(tagService.getTagsForInteraction(interactionId)).rejects.toThrow(
        `Interaction with ID ${interactionId} not found`
      );
    });
  });
});
