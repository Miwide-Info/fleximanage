export const en = {
  register: {
    title: 'Create Account',
    subtitle: brand => `Register your ${brand} account`,
    labels: {
      accountName: 'Account / Company Name',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      password: 'Password',
      jobTitle: 'Job Title',
      phone: 'Phone',
      country: 'Country',
      companySize: 'Company Size',
      serviceType: 'Service Type',
      numberSites: 'Number of Sites',
      captcha: 'Captcha',
      submit: 'Register'
    },
    helper: {
      requiredNote: 'Fields marked with * are required',
      haveAccount: 'Already have an account?',
      signIn: 'Sign in'
    },
    validation: {
      country: 'Country must be 2 letters (ISO alpha-2, e.g. US)',
      serviceType: 'Service Type must be 2-20 letters, numbers, space or -',
      captcha: 'Please complete the CAPTCHA'
    },
    placeholders: {
      country: 'US',
      serviceType: 'MSP'
    },
    debug: 'Captcha Debug'
  }
};
