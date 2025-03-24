/**
 * Interaction Service Tests
 * 
 * This file contains tests for the interaction service.
 */

import { InteractionService, InteractionType } from '../../services/interaction.service';
import tagService from '../../services/tag.service';
import { mockPrisma, setupPrismaMock } from '../mocks/prisma.mock';

// Mock the tag service
jest.mock('../../services/tag.service');

// Mock the global prisma instance
beforeEach(() => {
  setupPrismaMock();
});

describe('InteractionService', () => {
  let service: InteractionService;

  beforeEach(() => {
    service = new InteractionService();
    jest.clearAllMocks();
  });

  describe('createInteraction', () => {
    it('should create a new interaction log', async () => {
      // Arrange
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const mockInteraction = {
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        notes: 'Discussed project timeline',
        date: mockDate,
        personId: 'person-id-1',
        createdById: 'user-id-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: 'person-id-1', name: 'John Doe' },
        createdBy: { id: 'user-id-1', name: 'Admin User' },
        tagRelations: [
          { tag: { id: 'tag-1', name: 'important' } },
          { tag: { id: 'tag-2', name: 'follow-up' } }
        ]
      };

      mockPrisma.interactionLog.create.mockResolvedValue(mockInteraction);
      (tagService.associateTagsWithInteraction as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.createInteraction({
        type: InteractionType.CALL,
        notes: 'Discussed project timeline',
        date: mockDate,
        tagIds: ['tag-1', 'tag-2'],
        personId: 'person-id-1',
        createdById: 'user-id-1'
      });

      // Assert
      expect(mockPrisma.interactionLog.create).toHaveBeenCalledWith({
        data: {
          type: InteractionType.CALL,
          notes: 'Discussed project timeline',
          date: mockDate,
          person: {
            connect: { id: 'person-id-1' }
          },
          createdBy: {
            connect: { id: 'user-id-1' }
          }
        },
        include: {
          person: true,
          createdBy: true,
          tagRelations: {
            include: {
              tag: true
            }
          }
        }
      });
      expect(tagService.associateTagsWithInteraction).toHaveBeenCalledWith('interaction-id-1', ['tag-1', 'tag-2']);
      expect(result).toEqual(expect.objectContaining({
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        notes: 'Discussed project timeline',
        personId: 'person-id-1'
      }));
    });

    it('should throw an error if type is missing', async () => {
      // Act & Assert
      await expect(service.createInteraction({
        // @ts-ignore - intentionally missing type for test
        type: undefined,
        personId: 'person-id-1'
      })).rejects.toThrow('Interaction type is required');
    });

    it('should throw an error if personId is missing', async () => {
      // Act & Assert
      await expect(service.createInteraction({
        type: InteractionType.CALL,
        // @ts-ignore - intentionally missing personId for test
        personId: undefined
      })).rejects.toThrow('Person ID is required');
    });
  });

  describe('getInteractionById', () => {
    it('should return an interaction by ID', async () => {
      // Arrange
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const mockInteraction = {
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        notes: 'Discussed project timeline',
        date: mockDate,
        personId: 'person-id-1',
        createdById: 'user-id-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: 'person-id-1', name: 'John Doe' },
        createdBy: { id: 'user-id-1', name: 'Admin User' },
        tagRelations: [
          { tag: { id: 'tag-1', name: 'important' } },
          { tag: { id: 'tag-2', name: 'follow-up' } }
        ]
      };

      mockPrisma.interactionLog.findUnique.mockResolvedValue(mockInteraction);

      // Act
      const result = await service.getInteractionById('interaction-id-1');

      // Assert
      expect(mockPrisma.interactionLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'interaction-id-1' },
        include: {
          person: true,
          createdBy: true
        }
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        notes: 'Discussed project timeline',
        personId: 'person-id-1'
      }));
    });

    it('should return null if interaction is not found', async () => {
      // Arrange
      mockPrisma.interactionLog.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getInteractionById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getInteractions', () => {
    it('should return interactions with pagination', async () => {
      // Arrange
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const mockInteractions = [
        {
          id: 'interaction-id-1',
          type: InteractionType.CALL,
          notes: 'Discussed project timeline',
          date: mockDate,
          personId: 'person-id-1',
          createdById: 'user-id-1',
          createdAt: mockDate,
          updatedAt: mockDate,
          person: { id: 'person-id-1', name: 'John Doe' },
          createdBy: { id: 'user-id-1', name: 'Admin User' },
          tagRelations: [
            { tag: { id: 'tag-1', name: 'important' } },
            { tag: { id: 'tag-2', name: 'follow-up' } }
          ]
        },
        {
          id: 'interaction-id-2',
          type: InteractionType.EMAIL,
          notes: 'Sent project proposal',
          date: new Date('2025-03-23T00:00:00.000Z'),
          personId: 'person-id-2',
          createdById: 'user-id-1',
          createdAt: mockDate,
          updatedAt: mockDate,
          person: { id: 'person-id-2', name: 'Jane Smith' },
          createdBy: { id: 'user-id-1', name: 'Admin User' },
          tagRelations: [
            { tag: { id: 'tag-3', name: 'proposal' } }
          ]
        }
      ];

      // Mock the transformation that happens in the service
      const transformedInteractions = mockInteractions.map(interaction => ({
        ...interaction,
        structuredTags: interaction.tagRelations.map(relation => ({
          id: relation.tag.id,
          name: relation.tag.name,
          color: undefined,
          description: undefined
        }))
      }));

      mockPrisma.interactionLog.findMany.mockResolvedValue(mockInteractions);
      mockPrisma.interactionLog.count.mockResolvedValue(2);

      // Act
      const result = await service.getInteractions(
        { type: InteractionType.CALL },
        { page: 1, limit: 10 }
      );

      // Assert
      expect(mockPrisma.interactionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: InteractionType.CALL },
          include: expect.objectContaining({
            person: true,
            createdBy: true,
            tagRelations: expect.any(Object)
          }),
          skip: 0,
          take: 10,
          orderBy: {
            date: 'desc'
          }
        })
      );
      expect(result).toEqual({
        interactions: transformedInteractions,
        total: 2
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      const startDate = new Date('2025-03-01T00:00:00.000Z');
      const endDate = new Date('2025-03-31T23:59:59.999Z');
      
      mockPrisma.interactionLog.findMany.mockResolvedValue([]);
      mockPrisma.interactionLog.count.mockResolvedValue(0);

      // Act
      await service.getInteractions({
        startDate,
        endDate
      });

      // Assert
      expect(mockPrisma.interactionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        })
      );
    });

    it('should filter by tagIds', async () => {
      // Arrange
      const tagIds = ['tag-1', 'tag-2'];
      
      mockPrisma.interactionLog.findMany.mockResolvedValue([]);
      mockPrisma.interactionLog.count.mockResolvedValue(0);

      // Act
      await service.getInteractions({
        tagIds: tagIds
      });

      // Assert
      expect(mockPrisma.interactionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tagRelations: {
              some: {
                tagId: {
                  in: tagIds
                }
              }
            }
          }
        })
      );
    });
  });

  describe('getInteractionsByPerson', () => {
    it('should return interactions for a specific person', async () => {
      // Arrange
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const mockInteractions = [
        {
          id: 'interaction-id-1',
          type: InteractionType.CALL,
          notes: 'Discussed project timeline',
          date: mockDate,
          personId: 'person-id-1',
          createdById: 'user-id-1',
          createdAt: mockDate,
          updatedAt: mockDate,
          person: { id: 'person-id-1', name: 'John Doe' },
          createdBy: { id: 'user-id-1', name: 'Admin User' },
          tagRelations: [
            { tag: { id: 'tag-1', name: 'important' } },
            { tag: { id: 'tag-2', name: 'follow-up' } }
          ]
        }
      ];

      // Mock the transformation that happens in the service
      const transformedInteractions = mockInteractions.map(interaction => ({
        ...interaction,
        structuredTags: interaction.tagRelations.map(relation => ({
          id: relation.tag.id,
          name: relation.tag.name,
          color: undefined,
          description: undefined
        }))
      }));

      mockPrisma.interactionLog.findMany.mockResolvedValue(mockInteractions);
      mockPrisma.interactionLog.count.mockResolvedValue(1);

      // Act
      const result = await service.getInteractionsByPerson('person-id-1');

      // Assert
      expect(mockPrisma.interactionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            personId: 'person-id-1'
          })
        })
      );
      expect(result).toEqual({
        interactions: transformedInteractions,
        total: 1
      });
    });
  });

  describe('updateInteraction', () => {
    it('should update an interaction', async () => {
      // Arrange
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const mockInteraction = {
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        notes: 'Updated notes',
        date: mockDate,
        personId: 'person-id-1',
        createdById: 'user-id-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: 'person-id-1', name: 'John Doe' },
        createdBy: { id: 'user-id-1', name: 'Admin User' },
        tagRelations: [
          { tag: { id: 'tag-1', name: 'important' } },
          { tag: { id: 'tag-2', name: 'follow-up' } }
        ],
        structuredTags: [
          { id: 'tag-1', name: 'important', color: undefined, description: undefined },
          { id: 'tag-2', name: 'follow-up', color: undefined, description: undefined }
        ]
      };

      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: 'interaction-id-1' });
      mockPrisma.interactionLog.update.mockResolvedValue(mockInteraction);
      
      // Mock the second findUnique call that happens in the service
      mockPrisma.interactionLog.findUnique.mockImplementation((args: any) => {
        if (args.include && args.include.tagRelations) {
          return {
            ...mockInteraction,
            structuredTags: undefined // This will be added by the service
          };
        }
        return { id: 'interaction-id-1' };
      });

      // Act
      const result = await service.updateInteraction('interaction-id-1', {
        notes: 'Updated notes'
      });

      // Assert
      expect(mockPrisma.interactionLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'interaction-id-1' },
          data: expect.objectContaining({
            notes: 'Updated notes',
            updatedAt: expect.any(Date)
          }),
          include: expect.objectContaining({
            person: true,
            createdBy: true
          })
        })
      );
      expect(result).toEqual(expect.objectContaining({
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        notes: 'Updated notes',
        personId: 'person-id-1'
      }));
    });

    it('should throw an error if interaction is not found', async () => {
      // Arrange
      mockPrisma.interactionLog.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateInteraction('non-existent-id', {
        notes: 'Updated notes'
      })).rejects.toThrow('Interaction log with ID non-existent-id not found');
    });
  });

  describe('deleteInteraction', () => {
    it('should delete an interaction', async () => {
      // Arrange
      mockPrisma.interactionLog.findUnique.mockResolvedValue({ id: 'interaction-id-1' });
      mockPrisma.interactionLog.delete.mockResolvedValue({ id: 'interaction-id-1' });

      // Act
      const result = await service.deleteInteraction('interaction-id-1');

      // Assert
      expect(mockPrisma.interactionLog.delete).toHaveBeenCalledWith({
        where: { id: 'interaction-id-1' }
      });
      expect(result).toEqual({
        success: true,
        message: 'Interaction log deleted successfully'
      });
    });

    it('should throw an error if interaction is not found', async () => {
      // Arrange
      mockPrisma.interactionLog.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteInteraction('non-existent-id')).rejects.toThrow(
        'Interaction log with ID non-existent-id not found'
      );
    });
  });

  describe('addTagsById', () => {
    it('should add tags to an interaction', async () => {
      // Arrange
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const existingInteraction = {
        id: 'interaction-id-1'
      };
      const updatedInteraction = {
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        notes: 'Discussed project timeline',
        date: mockDate,
        personId: 'person-id-1',
        createdById: 'user-id-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: 'person-id-1', name: 'John Doe' },
        createdBy: { id: 'user-id-1', name: 'Admin User' },
        tagRelations: [
          { tag: { id: 'tag-1', name: 'existing-tag' } },
          { tag: { id: 'tag-2', name: 'new-tag-1' } },
          { tag: { id: 'tag-3', name: 'new-tag-2' } }
        ]
      };

      mockPrisma.interactionLog.findUnique.mockResolvedValue(existingInteraction);
      (tagService.associateTagsWithInteraction as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.interactionLog.findUnique.mockImplementation((args: any) => {
        if (args.include && args.include.tagRelations) {
          return updatedInteraction;
        }
        return existingInteraction;
      });

      // Act
      const result = await service.addTagsById('interaction-id-1', ['tag-2', 'tag-3']);

      // Assert
      expect(mockPrisma.interactionLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'interaction-id-1' }
      });
      expect(tagService.associateTagsWithInteraction).toHaveBeenCalledWith('interaction-id-1', ['tag-2', 'tag-3']);
      expect(result).toEqual(expect.objectContaining({
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        personId: 'person-id-1'
      }));
    });
  });

  describe('removeTagsById', () => {
    it('should remove tags from an interaction', async () => {
      // Arrange
      const mockDate = new Date('2025-03-24T00:00:00.000Z');
      const existingInteraction = {
        id: 'interaction-id-1'
      };
      const updatedInteraction = {
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        notes: 'Discussed project timeline',
        date: mockDate,
        personId: 'person-id-1',
        createdById: 'user-id-1',
        createdAt: mockDate,
        updatedAt: mockDate,
        person: { id: 'person-id-1', name: 'John Doe' },
        createdBy: { id: 'user-id-1', name: 'Admin User' },
        tagRelations: [
          { tag: { id: 'tag-1', name: 'tag-1' } }
        ]
      };

      mockPrisma.interactionLog.findUnique.mockResolvedValue(existingInteraction);
      (tagService.removeTagsFromInteraction as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.interactionLog.findUnique.mockImplementation((args: any) => {
        if (args.include && args.include.tagRelations) {
          return updatedInteraction;
        }
        return existingInteraction;
      });

      // Act
      const result = await service.removeTagsById('interaction-id-1', ['tag-2', 'tag-3']);

      // Assert
      expect(mockPrisma.interactionLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'interaction-id-1' }
      });
      expect(tagService.removeTagsFromInteraction).toHaveBeenCalledWith('interaction-id-1', ['tag-2', 'tag-3']);
      expect(result).toEqual(expect.objectContaining({
        id: 'interaction-id-1',
        type: InteractionType.CALL,
        personId: 'person-id-1'
      }));
    });
  });

  describe('getAllTags', () => {
    it('should return all unique tags', async () => {
      // Arrange
      const mockTags = [
        { id: 'tag-1', name: 'tag-1', color: 'blue', description: 'Tag 1' },
        { id: 'tag-2', name: 'tag-2', color: 'green', description: 'Tag 2' },
        { id: 'tag-3', name: 'tag-3', color: 'red', description: 'Tag 3' },
        { id: 'tag-4', name: 'tag-4', color: 'yellow', description: 'Tag 4' }
      ];

      (tagService.getTags as jest.Mock).mockResolvedValue({ tags: mockTags, total: 4 });

      // Act
      const result = await service.getAllTags();

      // Assert
      expect(tagService.getTags).toHaveBeenCalled();
      expect(result).toEqual(mockTags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description
      })));
    });
  });
});
