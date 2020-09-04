import validateInput from '../inputsValidations.js';

describe('HELPER_PLUGIN | utils | inputsValidation', () => {
  it('should accept correctly formatted email', () => {
    const errors = validateInput('john.doe@gmail.com', {}, 'email');
    expect(errors.length).toEqual(0);
  });

  it('should reject email with non-existing top-level domain', () => {
    const errors = validateInput('john.doe@gmail.doesnotexist', {}, 'email');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept email with subdomain in domain name', () => {
    const errors = validateInput('john.doe@mail.co.uk', {}, 'email');
    expect(errors.length).toEqual(0);
  });
});
