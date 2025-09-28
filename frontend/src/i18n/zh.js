export const zh = {
  register: {
    title: '创建账号',
    subtitle: brand => `注册你的 ${brand} 账号`,
    labels: {
      accountName: '公司 / 账号名称',
      firstName: '名',
      lastName: '姓',
      email: '邮箱',
      password: '密码',
      jobTitle: '职位',
      phone: '电话',
      country: '国家代码',
      companySize: '公司规模',
      serviceType: '服务类型',
      numberSites: '站点数量',
      captcha: '验证码',
      submit: '注册'
    },
    helper: {
      requiredNote: '带 * 的字段为必填',
      haveAccount: '已经有账号？',
      signIn: '登录'
    },
    validation: {
      country: '国家代码必须为 2 个英文字母 (ISO，如 US)',
      serviceType: '服务类型需 2-20 个字符 (字母/数字/空格/连字符)',
      captcha: '请完成验证码'
    },
    placeholders: {
      country: 'US',
      serviceType: 'MSP'
    },
    debug: '验证码调试'
  }
};
