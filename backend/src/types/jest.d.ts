// Type definitions for Jest
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInstanceOf(expected: any): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveBeenCalled(): R;
      toBe(expected: any): R;
      toEqual(expected: any): R;
      toBeGreaterThan(expected: number): R;
      toBeLessThan(expected: number): R;
      toHaveProperty(property: string, value?: any): R;
      not: Matchers<R>;
    }

    function fn(): any;
    function fn<T>(): jest.Mock<T>;
    function fn<T, Y extends any[]>(implementation?: (...args: Y) => T): jest.Mock<T, Y>;
    
    function mock(moduleName: string, factory?: any, options?: any): any;
    function clearAllMocks(): void;
    function resetAllMocks(): void;
    function restoreAllMocks(): void;
    function setTimeout(timeout: number): void;
    
    interface Mock<T = any, Y extends any[] = any[]> {
      (...args: Y): T;
      mockReturnValue(value: T): this;
      mockReturnThis(): this;
      mockImplementation(fn: (...args: Y) => T): this;
      mockResolvedValue(value: T): this;
      mockRejectedValue(value: any): this;
      mockReturnValueOnce(value: T): this;
      mockResolvedValueOnce(value: T): this;
      mockRejectedValueOnce(value: any): this;
      mockImplementationOnce(fn: (...args: Y) => T): this;
    }
  }

  function describe(name: string, fn: () => void): void;
  function beforeEach(fn: () => void): void;
  function afterEach(fn: () => void): void;
  function it(name: string, fn: () => void | Promise<void>, timeout?: number): void;
  function expect<T>(value: T): jest.Matchers<void>;
}

export {};
