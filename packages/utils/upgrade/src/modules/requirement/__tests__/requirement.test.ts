import { Requirement, requirementFactory } from '../requirement';
import type { RequirementTestCallback, TestContext } from '../types';

describe('Requirement', () => {
  const name = 'testRequirement';
  let testCallback: RequirementTestCallback | null;
  let requirement: Requirement;

  beforeEach(() => {
    testCallback = jest.fn();
    requirement = new Requirement(name, testCallback);
  });

  // Constructor Tests
  describe('constructor', () => {
    it('should set properties correctly', () => {
      expect(requirement.name).toBe(name);
      expect(requirement.testCallback).toBe(testCallback);
      expect(requirement.isRequired).toBe(true);
    });

    it('should set isRequired to false if provided as false', () => {
      const requirementWithOptional = new Requirement(name, testCallback, false);
      expect(requirementWithOptional.isRequired).toBe(false);
    });
  });

  // setChildren Method Test
  describe('setChildren', () => {
    it('should set children correctly', () => {
      const childRequirement = new Requirement('child', null);
      requirement.setChildren([childRequirement]);
      expect(requirement.children).toEqual([childRequirement]);
    });
  });

  // addChild Method Test
  describe('addChild', () => {
    it('should add a child correctly', () => {
      const childRequirement = new Requirement('child', null);
      requirement.addChild(childRequirement);
      expect(requirement.children).toContain(childRequirement);
    });
  });

  // optional Method Test
  describe('optional', () => {
    it('should create an optional requirement', () => {
      const optionalRequirement = requirement.asOptional();
      expect(optionalRequirement.isRequired).toBe(false);
      expect(optionalRequirement).not.toBe(requirement);
    });
  });

  // required Method Test
  describe('required', () => {
    it('should create a required requirement', () => {
      const requiredRequirement = requirement.asRequired();
      expect(requiredRequirement.isRequired).toBe(true);
      expect(requiredRequirement).not.toBe(requirement);
    });
  });

  // test Method Test
  describe('test', () => {
    it('should return pass if testCallback passes', async () => {
      testCallback = jest.fn().mockResolvedValue(undefined);
      requirement = new Requirement(name, testCallback);
      await expect(requirement.test({} as TestContext)).resolves.toEqual({
        pass: true,
        error: null,
      });
    });

    it('should return error if testCallback throws', async () => {
      const error = new Error('Test error');
      testCallback = jest.fn().mockRejectedValue(error);
      requirement = new Requirement(name, testCallback);
      await expect(requirement.test({} as TestContext)).resolves.toEqual({ pass: false, error });
    });
  });

  // requirementFactory Function Test
  describe('requirementFactory', () => {
    it('should create and return a new Requirement instance', () => {
      const newRequirement = requirementFactory(name, testCallback, false);
      expect(newRequirement).toBeInstanceOf(Requirement);
      expect(newRequirement.name).toBe(name);
      expect(newRequirement.testCallback).toBe(testCallback);
      expect(newRequirement.isRequired).toBe(false);
    });
  });
});
