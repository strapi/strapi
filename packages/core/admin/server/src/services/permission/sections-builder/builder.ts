import { Action } from '../../../domain/action';
import createSection, { SectionOptions } from './section';

/**
 * Create a new section builder with its own sections registry
 */
const createSectionBuilder = () => {
  const state = {
    sections: new Map(),
  };

  return {
    /**
     * Create & add a section to the builder's registry
     * @param sectionName - The unique name of the section
     * @param options - The options used to build a {@link Section}
     */
    createSection(sectionName: string, options: SectionOptions) {
      const section = createSection(options);

      state.sections.set(sectionName, section);

      return this;
    },

    /**
     * Removes a section from the builder's registry using its unique name
     * @param sectionName - The name of the section to delete
     */
    deleteSection(sectionName: string) {
      state.sections.delete(sectionName);

      return this;
    },

    /**
     * Register a handler function for a given section
     * @param  sectionName - The name of the section
     * @param  handler - The handler to register
     */
    addHandler(sectionName: string, handler: () => unknown) {
      if (state.sections.has(sectionName)) {
        state.sections.get(sectionName).hooks.handlers.register(handler);
      }

      return this;
    },

    /**
     * Register a matcher function for a given section
     * @param sectionName - The name of the section
     * @param matcher - The handler to register

     */
    addMatcher(sectionName: string, matcher: () => unknown) {
      if (state.sections.has(sectionName)) {
        state.sections.get(sectionName).hooks.matchers.register(matcher);
      }

      return this;
    },

    /**
     * Build a section tree based on the registered actions and the given actions
     * @param actions - The actions used to build each section
     */
    async build(actions = [] as Action[]) {
      const sections = {} as any;

      for (const [sectionName, section] of state.sections.entries()) {
        sections[sectionName] = await section.build(actions);
      }

      return sections;
    },
  };
};

export default createSectionBuilder;
