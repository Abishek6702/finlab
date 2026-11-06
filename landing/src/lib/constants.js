// Configuration constants for FinLab Landing Page

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9001';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

export function getAppUrl(path = '') {
  const cleanBase = APP_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export const BRAND = {
  name: 'finLab',
  fullName: 'finLab – Personal Finance Management',
  tagline: 'Your money. Your clarity. Your control.',
  positioning: 'Personal Finance, Simplified',
  description:
    'Take control of your financial life with one intelligent workspace. Track expenses, manage accounts, plan budgets and build better financial habits with finLab.',
};

export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'Security', href: '#security' },
  { label: 'FAQ', href: '#faq' },
];

export const TRUST_PRINCIPLES = [
  {
    title: 'Financial Clarity',
    description: 'Instant visibility into your net assets, inflows, and spending velocity without tedious manual spreadsheets.',
    icon: 'Sparkles',
  },
  {
    title: 'Organized Finances',
    description: 'Bring bank accounts, credit cards, investments, and cash holdings together into a unified ledger.',
    icon: 'Layers',
  },
  {
    title: 'Spending Awareness',
    description: 'Real-time category intelligence highlights where your money actually goes, eliminating month-end surprises.',
    icon: 'Eye',
  },
  {
    title: 'Smarter Budgeting',
    description: 'Set proactive category and overall spending boundaries with live utilization tracking and alert thresholds.',
    icon: 'ShieldCheck',
  },
];

export const FEATURES = [
  {
    title: 'Financial Dashboard',
    description: 'View your overall financial position, net assets, monthly cash flow, and recent ledger entries at a single glance.',
    icon: 'LayoutDashboard',
    tag: 'Workspace',
  },
  {
    title: 'Account Management',
    description: 'Organize and manage multiple bank accounts, cash reserves, and digital wallets with precise real-time balance tracking.',
    icon: 'Landmark',
    tag: 'Core Ledger',
  },
  {
    title: 'Income & Expense Tracking',
    description: 'Record transactions with granular categories, payment methods, tags, and notes to understand your true spending patterns.',
    icon: 'ArrowLeftRight',
    tag: 'Daily Finance',
  },
  {
    title: 'Smart Budget Planning',
    description: 'Set monthly or category-specific spending limits and monitor real-time utilization progress before overspending occurs.',
    icon: 'PieChart',
    tag: 'Planning',
  },
  {
    title: 'Savings Goals',
    description: 'Create dedicated targets for emergency funds, vacations, or home down payments with milestone tracking and deposits.',
    icon: 'Target',
    tag: 'Wealth Building',
  },
  {
    title: 'Recurring Transactions',
    description: 'Schedule predictable subscriptions, utility bills, rent, and salary credits with flexible frequency rules and alerts.',
    icon: 'CalendarClock',
    tag: 'Automation',
  },
  {
    title: 'Smart Categories',
    description: 'Organize financial activity into intuitive income and expense categories tailored to your personal lifestyle.',
    icon: 'Tags',
    tag: 'Organization',
  },
  {
    title: 'Reports & Analytics',
    description: 'Explore visual income vs. expense comparisons, category breakdowns, and export clean financial records in CSV format.',
    icon: 'TrendingUp',
    tag: 'Insights',
  },
];

export const STEPS = [
  {
    step: '01',
    title: 'Create your account',
    description: 'Register in seconds using your email and password or fast one-click Google Sign-In. No card required.',
    details: ['Secure password hashing', 'Instant workspace setup', 'Multi-device access'],
  },
  {
    step: '02',
    title: 'Organize your finances',
    description: 'Add your bank accounts, customize your favorite spending categories, and set your baseline currency preference.',
    details: ['Multi-currency support', 'Pre-configured categories', 'Initial balance ledger'],
  },
  {
    step: '03',
    title: 'Track, budget & understand',
    description: 'Log daily transactions, watch your monthly budgets update in real time, and gain total confidence over your money.',
    details: ['Live budget progress bars', 'Savings goal projections', 'One-click CSV exports'],
  },
];

export const BENEFITS = [
  {
    title: 'Understand where your money goes',
    description: 'Eliminate guesswork. Categorized transaction history breaks down every expenditure so you can identify leaks and optimize discretionary spending.',
    stat: '100%',
    statLabel: 'Transaction visibility',
  },
  {
    title: 'Build better spending habits',
    description: 'Live budget progress bars provide immediate visual feedback throughout the month, helping you pace your spending before limits are reached.',
    stat: '2.4x',
    statLabel: 'Better budget retention',
  },
  {
    title: 'Stay aware of your financial position',
    description: 'A centralized dashboard consolidates all your liquid accounts, savings balances, and credit liabilities into an accurate net asset summary.',
    stat: 'Real-time',
    statLabel: 'Ledger synchronization',
  },
  {
    title: 'Plan monthly budgets with confidence',
    description: 'Create category-specific or overall spending targets with automated rollover options and customizable alert warnings at 50%, 75%, and 90%.',
    stat: 'Zero',
    statLabel: 'Calculation drift',
  },
  {
    title: 'Monitor savings progress effortlessly',
    description: 'Keep your emergency fund and major milestones separate from everyday spending. Track deposits, percentage progress, and estimated target dates.',
    stat: 'Goals',
    statLabel: 'Dedicated tracking',
  },
];

export const SECURITY_POINTS = [
  {
    title: 'Secure Authentication',
    description: 'Protected with industry-standard bcrypt password hashing, encrypted JWT access tokens, and HttpOnly refresh tokens resistant to XSS.',
    icon: 'KeyRound',
  },
  {
    title: 'Protected Application Access',
    description: 'Every API endpoint enforces strict user-level authorization, ensuring your accounts, transactions, and budgets are accessible only to you.',
    icon: 'UserCheck',
  },
  {
    title: 'Encrypted Communication',
    description: 'All traffic between your browser and our servers is secured over TLS/HTTPS in production, encrypting your data in transit.',
    icon: 'Shield',
  },
  {
    title: 'Responsible Data Ownership',
    description: 'We do not sell your personal financial records or share data with advertising brokers. You can export all your data in JSON or delete your account anytime.',
    icon: 'Database',
  },
];

export const FAQS = [
  {
    question: 'What is finLab?',
    answer:
      'finLab is a modern, unified personal finance management platform designed to help individuals track income and expenses, organize multiple bank accounts, plan monthly budgets, schedule recurring transactions, and reach their savings goals in one intuitive workspace.',
  },
  {
    question: 'Is finLab free to use?',
    answer:
      'Yes, finLab is completely free to use. All core personal finance capabilities—including unlimited accounts, transaction logging, category budgets, savings goals, and data export—are available without subscription paywalls or hidden fees.',
  },
  {
    question: 'Can I track both income and expenses?',
    answer:
      'Absolutely. finLab supports income, expenses, internal account transfers, and refunds. Each entry can be tagged with categories, custom notes, dates, and accounts, providing an authoritative double-entry audit trail.',
  },
  {
    question: 'Can I manage multiple financial accounts?',
    answer:
      'Yes. You can manage multiple checking accounts, savings accounts, credit cards, cash wallets, and investment holdings. finLab tracks each balance independently and displays your aggregated net assets.',
  },
  {
    question: 'Can I create monthly budgets?',
    answer:
      'Yes. You can establish overall monthly budgets or category-specific spending targets (e.g., Food & Dining, Groceries, Travel). finLab calculates real-time spending progress against your limits and provides visual warning indicators as you approach 100%.',
  },
  {
    question: 'Does finLab support Google Login?',
    answer:
      'Yes. finLab supports one-click authentication with Google Sign-In in addition to traditional email and password registration, providing a frictionless and secure onboarding experience.',
  },
  {
    question: 'Can I access finLab on mobile?',
    answer:
      'Yes. finLab is engineered with a mobile-first, responsive design. You can smoothly manage transactions, check balances, and review budgets from smartphones, tablets, laptops, and desktop computers alike.',
  },
  {
    question: 'How is my financial information protected?',
    answer:
      'finLab employs strict security engineering practices: robust password hashing using bcrypt, isolated user-scoped database tenancy, authenticated JWT sessions with HttpOnly cookies, HTTPS encryption in transit, and complete user ownership with full JSON export and account deactivation controls.',
  },
];

