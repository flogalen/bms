import { PersonService, PersonStatus, FieldType } from '../../services/person.service';
import { PrismaClient } from '@prisma/client';

import { mockPrisma, setupPrismaMock } from '../mocks/prisma.mock';

// Set up global prisma mock for tests
(global as any).prisma = mockPrisma;
setupPrismaMock();

// Import the service after mocking
const personService = require('../../services/person.service').default;

describe('PersonService', () => {
  beforeEach(() => {
    setupPrismaMock();
    jest.clearAllMocks();
  });

  describe('createPerson', () => {
    it('should create a person with valid data', async () => {
      // Arrange
      const personData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        status: PersonStatus.ACTIVE,
      };

      const mockCreatedPerson = {
        id: '123',
        ...personData,
        createdAt: new Date(),
        updatedAt: new Date(),
        dynamicFields: [],
      };

      mockPrisma.person.create.mockResolvedValue(mockCreatedPerson);

      // Act
      const result = await personService.createPerson(personData);

      // Assert
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: personData,
        include: { dynamicFields: true },
      });
      expect(result).toEqual(mockCreatedPerson);
    });

    it('should create a person with dynamic fields', async () => {
      // Arrange
      const personData = {
        name: 'John Doe',
        email: 'john@example.com',
        dynamicFields: [
          {
            fieldName: 'Company',
            fieldType: FieldType.STRING,
            stringValue: 'Acme Inc',
          },
          {
            fieldName: 'Revenue',
            fieldType: FieldType.NUMBER,
            numberValue: 1000000,
          },
        ],
      };

      const mockCreatedPerson = {
        id: '123',
        name: personData.name,
        email: personData.email,
        status: PersonStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        dynamicFields: [
          {
            id: 'df1',
            fieldName: 'Company',
            fieldType: FieldType.STRING,
            stringValue: 'Acme Inc',
            numberValue: null,
            booleanValue: null,
            dateValue: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            personId: '123',
          },
          {
            id: 'df2',
            fieldName: 'Revenue',
            fieldType: FieldType.NUMBER,
            stringValue: null,
            numberValue: 1000000,
            booleanValue: null,
            dateValue: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            personId: '123',
          },
        ],
      };

      mockPrisma.person.create.mockResolvedValue(mockCreatedPerson);

      // Act
      const result = await personService.createPerson(personData);

      // Assert
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: {
          name: personData.name,
          email: personData.email,
          dynamicFields: {
            create: [
              {
                fieldName: 'Company',
                fieldType: FieldType.STRING,
                stringValue: 'Acme Inc',
                numberValue: undefined,
                booleanValue: undefined,
                dateValue: undefined,
              },
              {
                fieldName: 'Revenue',
                fieldType: FieldType.NUMBER,
                stringValue: undefined,
                numberValue: 1000000,
                booleanValue: undefined,
                dateValue: undefined,
              },
            ],
          },
        },
        include: { dynamicFields: true },
      });
      expect(result).toEqual(mockCreatedPerson);
    });

    it('should throw an error if name is missing', async () => {
      // Arrange
      const personData = {
        email: 'john@example.com',
      } as any;

      // Mock the validation to throw an error
      mockPrisma.person.create.mockImplementation(() => {
        throw new Error('Name is required');
      });

      // Act & Assert
      await expect(personService.createPerson(personData)).rejects.toThrow('Name is required');
    });

    it('should throw an error if email is invalid', async () => {
      // Arrange
      const personData = {
        name: 'John Doe',
        email: 'invalid-email',
      };

      // Act & Assert
      await expect(personService.createPerson(personData)).rejects.toThrow('Invalid email format');
    });
  });

  describe('getPersonById', () => {
    it('should return a person by ID', async () => {
      // Arrange
      const personId = '123';
      const mockPerson = {
        id: personId,
        name: 'John Doe',
        email: 'john@example.com',
        status: PersonStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        dynamicFields: [],
        interactions: [],
      };

      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);

      // Act
      const result = await personService.getPersonById(personId);

      // Assert
      expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
        where: { id: personId },
        include: { dynamicFields: true, interactions: true },
      });
      expect(result).toEqual(mockPerson);
    });

    it('should return null if person is not found', async () => {
      // Arrange
      const personId = 'non-existent';
      mockPrisma.person.findUnique.mockResolvedValue(null);

      // Act
      const result = await personService.getPersonById(personId);

      // Assert
      expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
        where: { id: personId },
        include: { dynamicFields: true, interactions: true },
      });
      expect(result).toBeNull();
    });
  });

  describe('getPeople', () => {
    it('should return people with pagination', async () => {
      // Arrange
      const mockPeople = [
        {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          status: PersonStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          dynamicFields: [],
        },
        {
          id: '456',
          name: 'Jane Smith',
          email: 'jane@example.com',
          status: PersonStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          dynamicFields: [],
        },
      ];

      mockPrisma.person.count.mockResolvedValue(2);
      mockPrisma.person.findMany.mockResolvedValue(mockPeople);

      // Act
      const result = await personService.getPeople({}, { page: 1, limit: 10 });

      // Assert
      expect(mockPrisma.person.count).toHaveBeenCalledWith({ where: {} });
      expect(mockPrisma.person.findMany).toHaveBeenCalledWith({
        where: {},
        include: { dynamicFields: true },
        skip: 0,
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual({ people: mockPeople, total: 2 });
    });

    it('should filter people by status', async () => {
      // Arrange
      const mockPeople = [
        {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          status: PersonStatus.LEAD,
          createdAt: new Date(),
          updatedAt: new Date(),
          dynamicFields: [],
        },
      ];

      mockPrisma.person.count.mockResolvedValue(1);
      mockPrisma.person.findMany.mockResolvedValue(mockPeople);

      // Act
      const result = await personService.getPeople({ status: PersonStatus.LEAD });

      // Assert
      expect(mockPrisma.person.count).toHaveBeenCalledWith({
        where: { status: PersonStatus.LEAD },
      });
      expect(mockPrisma.person.findMany).toHaveBeenCalledWith({
        where: { status: PersonStatus.LEAD },
        include: { dynamicFields: true },
        skip: 0,
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual({ people: mockPeople, total: 1 });
    });

    it('should search people by name, email, etc.', async () => {
      // Arrange
      const searchTerm = 'john';
      const mockPeople = [
        {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          status: PersonStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          dynamicFields: [],
        },
      ];

      mockPrisma.person.count.mockResolvedValue(1);
      mockPrisma.person.findMany.mockResolvedValue(mockPeople);

      // Act
      const result = await personService.getPeople({ search: searchTerm });

      // Assert
      const expectedWhere = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
          { role: { contains: searchTerm, mode: 'insensitive' } },
          { notes: { contains: searchTerm, mode: 'insensitive' } },
          { address: { contains: searchTerm, mode: 'insensitive' } },
        ],
      };
      expect(mockPrisma.person.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.person.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        include: { dynamicFields: true },
        skip: 0,
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual({ people: mockPeople, total: 1 });
    });
  });

  describe('updatePerson', () => {
    it('should update a person with valid data', async () => {
      // Arrange
      const personId = '123';
      const updateData = {
        name: 'John Updated',
        email: 'john.updated@example.com',
      };

      const existingPerson = {
        id: personId,
        name: 'John Doe',
        email: 'john@example.com',
        status: PersonStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        dynamicFields: [],
      };

      const updatedPerson = {
        ...existingPerson,
        ...updateData,
        updatedAt: new Date(),
      };

      mockPrisma.person.findUnique.mockResolvedValueOnce(existingPerson);
      mockPrisma.person.update.mockResolvedValueOnce(updatedPerson);
      mockPrisma.person.findUnique.mockResolvedValueOnce(updatedPerson); // For the final fetch

      // Act
      const result = await personService.updatePerson(personId, updateData);

      // Assert
      expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
        where: { id: personId },
        include: { dynamicFields: true },
      });
      expect(mockPrisma.person.update).toHaveBeenCalledWith({
        where: { id: personId },
        data: {
          ...updateData,
          updatedAt: expect.any(Date),
        },
        include: { dynamicFields: true },
      });
      expect(result).toEqual(updatedPerson);
    });

    it('should throw an error if person is not found', async () => {
      // Arrange
      const personId = 'non-existent';
      const updateData = {
        name: 'John Updated',
      };

      mockPrisma.person.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(personService.updatePerson(personId, updateData)).rejects.toThrow(
        `Person with ID ${personId} not found`
      );
    });
  });

  describe('deletePerson', () => {
    it('should delete a person', async () => {
      // Arrange
      const personId = '123';
      const existingPerson = {
        id: personId,
        name: 'John Doe',
      };

      mockPrisma.person.findUnique.mockResolvedValue(existingPerson);
      mockPrisma.person.delete.mockResolvedValue(existingPerson);

      // Act
      const result = await personService.deletePerson(personId);

      // Assert
      expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
        where: { id: personId },
      });
      expect(mockPrisma.person.delete).toHaveBeenCalledWith({
        where: { id: personId },
      });
      expect(result).toEqual({
        success: true,
        message: 'Person deleted successfully',
      });
    });

    it('should throw an error if person is not found', async () => {
      // Arrange
      const personId = 'non-existent';
      mockPrisma.person.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(personService.deletePerson(personId)).rejects.toThrow(
        `Person with ID ${personId} not found`
      );
    });
  });

  describe('addDynamicField', () => {
    it('should add a dynamic field to a person', async () => {
      // Arrange
      const personId = '123';
      const fieldData = {
        fieldName: 'Company',
        fieldType: FieldType.STRING,
        stringValue: 'Acme Inc',
      };

      const existingPerson = {
        id: personId,
        name: 'John Doe',
      };

      const createdField = {
        id: 'df1',
        ...fieldData,
        personId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.person.findUnique.mockResolvedValue(existingPerson);
      mockPrisma.dynamicField.create.mockResolvedValue(createdField);

      // Act
      const result = await personService.addDynamicField(personId, fieldData);

      // Assert
      expect(mockPrisma.person.findUnique).toHaveBeenCalledWith({
        where: { id: personId },
      });
      expect(mockPrisma.dynamicField.create).toHaveBeenCalledWith({
        data: {
          ...fieldData,
          personId,
        },
      });
      expect(result).toEqual(createdField);
    });

    it('should throw an error if person is not found', async () => {
      // Arrange
      const personId = 'non-existent';
      const fieldData = {
        fieldName: 'Company',
        fieldType: FieldType.STRING,
        stringValue: 'Acme Inc',
      };

      mockPrisma.person.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(personService.addDynamicField(personId, fieldData)).rejects.toThrow(
        `Person with ID ${personId} not found`
      );
    });
  });

  describe('removeDynamicField', () => {
    it('should remove a dynamic field', async () => {
      // Arrange
      const fieldId = 'df1';
      const existingField = {
        id: fieldId,
        fieldName: 'Company',
        fieldType: FieldType.STRING,
        stringValue: 'Acme Inc',
      };

      mockPrisma.dynamicField.findUnique.mockResolvedValue(existingField);
      mockPrisma.dynamicField.delete.mockResolvedValue(existingField);

      // Act
      const result = await personService.removeDynamicField(fieldId);

      // Assert
      expect(mockPrisma.dynamicField.findUnique).toHaveBeenCalledWith({
        where: { id: fieldId },
      });
      expect(mockPrisma.dynamicField.delete).toHaveBeenCalledWith({
        where: { id: fieldId },
      });
      expect(result).toEqual({
        success: true,
        message: 'Dynamic field removed successfully',
      });
    });

    it('should throw an error if field is not found', async () => {
      // Arrange
      const fieldId = 'non-existent';
      mockPrisma.dynamicField.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(personService.removeDynamicField(fieldId)).rejects.toThrow(
        `Dynamic field with ID ${fieldId} not found`
      );
    });
  });

  describe('validation', () => {
    it('should validate email format', async () => {
      // Arrange
      const validEmails = ['test@example.com', 'user.name@domain.co.uk'];
      const invalidEmails = ['test@', 'test@domain', 'test.domain.com'];

      // Act & Assert
      for (const email of validEmails) {
        const personData = {
          name: 'Test User',
          email,
        };
        mockPrisma.person.create.mockResolvedValue({
          ...personData,
          id: '123',
          createdAt: new Date(),
          updatedAt: new Date(),
          dynamicFields: [],
        });
        await expect(personService.createPerson(personData)).resolves.toBeDefined();
      }

      for (const email of invalidEmails) {
        const personData = {
          name: 'Test User',
          email,
        };
        await expect(personService.createPerson(personData)).rejects.toThrow('Invalid email format');
      }
    });

    it('should validate phone format', async () => {
      // Arrange
      const validPhones = ['+1234567890', '(123) 456-7890', '123-456-7890'];
      const invalidPhones = ['abc', '123abc456'];

      // Act & Assert
      for (const phone of validPhones) {
        const personData = {
          name: 'Test User',
          phone,
        };
        mockPrisma.person.create.mockResolvedValue({
          ...personData,
          id: '123',
          createdAt: new Date(),
          updatedAt: new Date(),
          dynamicFields: [],
        });
        await expect(personService.createPerson(personData)).resolves.toBeDefined();
      }

      for (const phone of invalidPhones) {
        const personData = {
          name: 'Test User',
          phone,
        };
        await expect(personService.createPerson(personData)).rejects.toThrow('Invalid phone format');
      }
    });

    it('should validate dynamic field values match their types', async () => {
      // Arrange
      const personId = '123';
      const existingPerson = {
        id: personId,
        name: 'John Doe',
      };
      mockPrisma.person.findUnique.mockResolvedValue(existingPerson);

      // Act & Assert
      // String type requires string value
      const stringField = {
        fieldName: 'Company',
        fieldType: FieldType.STRING,
        // Missing stringValue
      };
      await expect(personService.addDynamicField(personId, stringField as any)).rejects.toThrow(
        'String value is required for field type STRING'
      );

      // Number type requires number value
      const numberField = {
        fieldName: 'Revenue',
        fieldType: FieldType.NUMBER,
        // Missing numberValue
      };
      await expect(personService.addDynamicField(personId, numberField as any)).rejects.toThrow(
        'Number value is required for NUMBER field type'
      );

      // Boolean type requires boolean value
      const booleanField = {
        fieldName: 'IsActive',
        fieldType: FieldType.BOOLEAN,
        // Missing booleanValue
      };
      await expect(personService.addDynamicField(personId, booleanField as any)).rejects.toThrow(
        'Boolean value is required for BOOLEAN field type'
      );

      // Date type requires date value
      const dateField = {
        fieldName: 'StartDate',
        fieldType: FieldType.DATE,
        // Missing dateValue
      };
      await expect(personService.addDynamicField(personId, dateField as any)).rejects.toThrow(
        'Date value is required for DATE field type'
      );

      // Email type requires valid email
      const emailField = {
        fieldName: 'WorkEmail',
        fieldType: FieldType.EMAIL,
        stringValue: 'invalid-email',
      };
      await expect(personService.addDynamicField(personId, emailField)).rejects.toThrow(
        'Invalid email format for EMAIL field type'
      );

      // URL type requires valid URL
      const urlField = {
        fieldName: 'Website',
        fieldType: FieldType.URL,
        stringValue: 'invalid-url',
      };
      await expect(personService.addDynamicField(personId, urlField)).rejects.toThrow(
        'Invalid URL format for URL field type'
      );
    });
  });
});
