export const mobileMenuConfig = [
  {
    key: 'admin_dashboard_root',
    title: 'Dashboard',
    icon: 'bi bi-house',
    route: 'Home'
  },
  {
    key: 'admin_sales_operational',
    title: 'Sales & CRM',
    icon: 'bi bi-cart',
    feature_flag: 'is_sales_enabled',
    roles: ['admin'],
    items: [
      { route: 'alldata', title: 'All Data', icon: 'bi bi-collection', permission: 'sales.alldata' },
      { route: 'myleads', title: 'My Leads', icon: 'bi bi-person', permission: 'sales.myleads' },
      { route: 'teamleads', title: 'Team Leads', icon: 'bi bi-people', condition: 'has_subordinates', permission: 'sales.teamleads' },
      { route: 'assignedleads', title: 'Assigned Leads', icon: 'bi bi-person-check', condition: 'is_manager', permission: 'sales.assignedleads' },
      { route: 'followup', title: 'Follow Up', icon: 'bi bi-bell', permission: 'sales.followup' },
      { route: 'quotation', title: 'Quotation', icon: 'bi bi-file-text', permission: 'sales.quotation' },
      { route: 'payment-followup', title: 'Payment Followup', icon: 'bi bi-cash-coin', permission: 'sales.payment_followup' },
      { route: 'formbuilder.index', title: 'Lead Form', icon: 'bi bi-ui-checks-grid', permission: 'sales.leadform' },
      { route: 'indiamart.index', title: 'External Leads', icon: 'bi bi-bag', permission: 'sales.indiamart' },
      { route: 'indiamart.junk.index', title: 'External Junk Leads', icon: 'bi bi-trash', permission: 'sales.indiamart.junk' },
    ]
  },
  {
    key: 'admin_tele_calling',
    title: 'Tele Calling',
    icon: 'bi bi-telephone-outbound',
    feature_flag: 'is_tally_calling_enabled',
    roles: ['admin'],
    items: [
      { route: 'calling.all', title: 'All Calls', icon: 'bi bi-collection', permission: 'sales.calling.all' },
      { route: 'calling.list.index', title: 'List', icon: 'bi bi-list-task', permission: 'sales.calling.list' },
      { route: 'calling', title: 'Campaign', icon: 'bi bi-megaphone', permission: 'sales.calling' },
      { route: 'calling.lock', title: 'Lock Calling', icon: 'bi bi-lock', permission: 'sales.calling.lock' },
      { route: 'calling.my', title: 'My Calls', icon: 'bi bi-person', permission: 'sales.calling.my' },
      { route: 'calling.team', title: 'Team Calls', icon: 'bi bi-people', condition: 'has_subordinates', permission: 'sales.calling.team' },
      { route: 'calling.assigned', title: 'Assigned Calls', icon: 'bi bi-person-check', condition: 'is_manager', permission: 'sales.calling.assigned' },
      { route: 'calling.converted', title: 'Converted Calls', icon: 'bi bi-stars', permission: 'sales.calling.converted' },
      { route: 'calling.todays', title: 'Today\'s Calls', icon: 'bi bi-calendar-date', permission: 'sales.calling.todays' },
      { route: 'calling.junk', title: 'Junk Calls', icon: 'bi bi-trash', permission: 'sales.calling.junk' },
    ]
  },
  {
    key: 'admin_lead_generation',
    title: 'Lead Generation',
    icon: 'bi bi-person-plus',
    feature_flag: 'is_leadgen_enabled',
    roles: ['admin'],
    items: [
      { route: 'leadgen.my', title: 'My Gen Leads', icon: 'bi bi-person-workspace', permission: 'leadgen.my' },
    ]
  },
  {
    key: 'admin_projects',
    title: 'Projects',
    route: 'projects.index',
    icon: 'bi bi-kanban',
    feature_flag: 'is_projects_enabled',
    roles: ['admin'],
    permission: 'projects.view'
  },
  {
    key: 'admin_subs_renewal',
    title: 'Subs & Renewal',
    route: 'subscriptions.index',
    icon: 'bi bi-arrow-repeat',
    feature_flag: 'is_subscription_enabled',
    roles: ['admin'],
    permission: 'subscription.view'
  },
  {
    key: 'admin_tracking',
    title: 'Tracking',
    route: 'tracking.index',
    icon: 'bi bi-geo-alt',
    feature_flag: 'is_tracking_enabled',
    roles: ['admin'],
    permission: 'tracking.view'
  },
  {
    key: 'admin_worklog_operational',
    title: 'Timesheet',
    icon: 'bi bi-clock',
    feature_flag: 'is_worklog_enabled',
    roles: ['admin'],
    items: [
      { route: 'worklog', title: 'Timesheet', icon: 'bi bi-clipboard-check', permission: 'worklog.entry' },
      { route: 'worklog-history', title: 'Timesheet History', icon: 'bi bi-clock-history', permission: 'worklog.history' },
      { route: 'worklog-missing-summary', title: 'Missing Entries Summary', icon: 'bi bi-exclamation-triangle', permission: 'worklog.missing_summary' },
    ]
  },
  {
    key: 'workflow_critical_path',
    title: 'Workflow',
    icon: 'bi bi-diagram-3',
    feature_flag: 'is_workflow_enabled',
    roles: ['admin'],
    items: [
      { route: 'critical-path.index', title: 'Critical Path', icon: 'bi bi-diagram-2', permission: 'workflow.critical_path' },
      { route: 'workflow-templates.index', title: 'Workflow Templates', icon: 'bi bi-journal-text', permission: 'workflow.templates' },
      { route: 'workflow-dependencies.index', title: 'Dependencies', icon: 'bi bi-diagram-3-fill', permission: 'workflow.dependencies' },
    ]
  },
  {
    key: 'calendar_section',
    title: 'Social Media Calendar',
    icon: 'bi bi-calendar3',
    feature_flag: 'is_social_media_calendar_enabled',
    roles: ['admin'],
    items: [
      { route: 'calendar.index', title: 'Calendar', icon: 'bi bi-calendar3', permission: 'calendar.view' },
      { route: 'calendar-client-event.links', title: 'Manage Calendar', icon: 'bi bi-diagram-2', permission: 'calendar.client_event_links' },
    ]
  },
  {
    key: 'master_section',
    title: 'Master',
    icon: 'bi bi-person-badge',
    feature_flag: 'is_setup_enabled',
    roles: ['admin'],
    items: [
      { route: 'employees.index', title: 'Employees', icon: 'bi bi-people', permission: 'master.employees' },
    ]
  },
  {
    key: 'admin_tasks',
    title: 'Tasks & Reminders',
    icon: 'bi bi-list-task',
    feature_flag: 'is_task_reminders_enabled',
    roles: ['admin'],
    items: [
      { route: 'all-tasks.index', title: 'All Tasks', icon: 'bi bi-card-list', permission: 'task.view' },
      { route: 'task.index', title: 'Task', tooltip: 'Task assign by me', icon: 'bi bi-list-task', permission: 'task.my_created' },
      { route: 'my-tasks.index', title: 'My Tasks', tooltip: 'Task assign to me', icon: 'bi bi-person-check', permission: 'task.my_tasks' },
    ]
  },
  {
    key: 'admin_attendance_operational',
    title: 'Attendance',
    icon: 'bi bi-person-check',
    feature_flag: 'is_attendance_enabled',
    roles: ['admin'],
    items: [
      { route: 'attendance', title: 'Mark Attendance', icon: 'bi bi-person-check', permission: 'attendance.entry' },
      { route: 'attendance.history', title: 'Attendance History', icon: 'bi bi-journal-text', permission: 'attendance.history' },
      { route: 'leave.index', title: 'Leave', icon: 'bi bi-calendar-minus', permission: 'attendance.leave' },
      // { route: 'attendance.facekiosk', title: 'Face Kiosk Mode', icon: 'bi bi-camera', permission: 'attendance.entry' },
    ]
  },
  {
    key: 'admin_payroll_operational',
    title: 'Payroll',
    icon: 'bi bi-cash-stack',
    feature_flag: 'is_payroll_enabled',
    roles: ['admin'],
    items: [
      { route: 'payroll.attendance.review', title: 'Attendance Review', icon: 'bi bi-calendar-check', permission: 'payroll.attendance' },
      { route: 'payroll.process.index', title: 'Process Payroll', icon: 'bi bi-calculator', permission: 'payroll.process' },
    ]
  },
  {
    key: 'admin_reports',
    title: 'Reports',
    icon: 'bi bi-file-earmark-bar-graph',
    feature_flag: 'is_reports_enabled',
    roles: ['admin'],
    items: [
      { route: 'attendance.report', title: 'Attendance Report', icon: 'bi bi-file-earmark-text', permission: 'attendance.report' },
      { route: 'payroll.report', title: 'Salary Report', icon: 'bi bi-cash-stack', permission: 'payroll.report', feature_flag: 'is_payroll_enabled' },
      { route: 'reports.worklog', title: 'Timesheet Report', icon: 'bi bi-journals', permission: 'reports.worklog', feature_flag: 'is_worklog_enabled' },
      { route: 'tracking.report', title: 'Tracking Report', icon: 'bi bi-geo-alt', permission: 'tracking.view', feature_flag: 'is_tracking_enabled' },
    ]
  },
  {
    key: 'admin_document_management',
    title: 'Document',
    icon: 'bi bi-folder2-open',
    feature_flag: 'is_document_management_enabled',
    roles: ['admin'],
    items: [
      { route: 'document.index', title: 'Manage Documents', icon: 'bi bi-folder', permission: 'documents.manage' },
      { route: 'document.user-access', title: 'My Documents', icon: 'bi bi-person-check', permission: 'documents.my_documents' },
    ]
  },
  {
    key: 'petty_cash_section',
    title: 'Petty Cash',
    route: 'petty-cash.index',
    icon: 'bi bi-cash-stack',
    feature_flag: 'is_petty_cash_enable',
    roles: ['admin'],
    permission: 'petty_cash.view'
  },
  {
    key: 'approvals_section',
    title: 'Approvals',
    icon: 'bi bi-check2-circle',
    feature_flag: 'is_approval_enabled',
    roles: ['admin'],
    items: [
      { route: 'approvals.petty', title: 'Petty Approval', icon: 'bi bi-cash', permission: 'approvals.petty' },
      { route: 'worklog-approvals', title: 'Timesheet Approvals', icon: 'bi bi-check2-square', permission: 'approvals.worklog', feature_flag: 'is_worklog_enabled' },
      { route: 'attendance.approval', title: 'Attendance Approval', icon: 'bi bi-person-check', permission: 'approvals.attendance' },
      { route: 'attendance.unlock', title: 'Unlock Attendance', icon: 'bi bi-unlock', permission: 'approvals.unlock_attendance' },
      { route: 'leave.approvals', title: 'Leave Approval', icon: 'bi bi-calendar-check', permission: 'approvals.leave' },
    ]
  },
  {
    key: 'contact_management',
    title: 'Contact Management',
    route: 'contactmanagement.index',
    icon: 'bi bi-person-lines-fill',
    feature_flag: 'is_contact_management',
    roles: ['admin'],
    permission: 'contact_management.access'
  },
  {
    key: 'asset_management',
    title: 'Asset Management',
    route: 'asset-management.index',
    icon: 'bi bi-box-seam',
    feature_flag: 'is_asset_management_enable',
    roles: ['admin'],
    permission: 'asset_management.access'
  },
  {
    key: 'email_marketing',
    title: 'Email Marketing',
    route: 'emailmarketing.index',
    icon: 'bi bi-envelope',
    feature_flag: 'is_email_marketing_enable',
    roles: ['admin'],
    permission: 'email_marketing.view'
  },
  {
    key: 'software_setup',
    title: 'Software Setup',
    icon: 'bi bi-gear-fill',
    roles: ['admin'],
    items: [
      // Core Setup
      { route: 'state', title: 'State', icon: 'bi bi-globe', permission: 'setup.state', feature_flag: 'is_core_setup_enabled' },
      { route: 'city', title: 'City', icon: 'bi bi-geo-alt', permission: 'setup.city', feature_flag: 'is_core_setup_enabled' },
      { route: 'countries.index', title: 'Countries', icon: 'bi bi-flag', permission: 'setup.countries', feature_flag: 'is_core_setup_enabled' },
      // User Management
      { route: 'user', title: 'User Management', icon: 'bi bi-people', permission: 'setup.users', feature_flag: 'is_user_setup_enabled' },
      { route: 'role-master', title: 'Role Master', icon: 'bi bi-shield-lock', permission: 'setup.roles', feature_flag: 'is_user_setup_enabled' },
      // Master Setup 
      { route: 'branches.index', title: 'Branches', icon: 'bi bi-diagram-3', permission: 'setup.branches', feature_flag: 'is_master_setup_enabled' },
      { route: 'shifts.index', title: 'Shift', icon: 'bi bi-clock-history', permission: 'setup.shifts', feature_flag: 'is_master_setup_enabled' },
      { route: 'departments.index', title: 'Departments', icon: 'bi bi-diagram-2', permission: 'setup.departments', feature_flag: 'is_master_setup_enabled' },
      { route: 'designations.index', title: 'Designations', icon: 'bi bi-badge-ad', permission: 'setup.designations', feature_flag: 'is_master_setup_enabled' },
      { route: 'employment-types.index', title: 'Employment Types', icon: 'bi bi-briefcase', permission: 'setup.employment_types', feature_flag: 'is_master_setup_enabled' },
      { route: 'leave-type.index', title: 'Leave Types', icon: 'bi bi-airplane', permission: 'setup.leave_types', feature_flag: 'is_master_setup_enabled' },
      { route: 'late-reasons.index', title: 'Late Reasons', icon: 'bi bi-clock-history', permission: 'setup.late_reasons', feature_flag: 'is_master_setup_enabled' },
      { route: 'places.index', title: 'Places', icon: 'bi bi-map', permission: 'setup.places', feature_flag: 'is_master_setup_enabled' },
      // Sales Setup 
      { route: 'status', title: 'Sales Status', icon: 'bi bi-check2-circle', permission: 'setup.sales_status', feature_flag: 'is_sales_setup_enabled' },
      { route: 'source', title: 'Lead Source', icon: 'bi bi-diagram-3', permission: 'setup.lead_source', feature_flag: 'is_sales_setup_enabled' },
      { route: 'product', title: 'Product', icon: 'bi bi-box2', permission: 'setup.products', feature_flag: 'is_sales_setup_enabled' },
      { route: 'business', title: 'Business Type', icon: 'bi bi-briefcase', permission: 'setup.business_types', feature_flag: 'is_sales_setup_enabled' },
      { route: 'calling-type.index', title: 'Calling Types', icon: 'bi bi-list-ul', permission: 'setup.calling_types', feature_flag: 'is_tally_calling_setup_enabled' },
      { route: 'whatsapp-template.index', title: 'Whatsapp Template', icon: 'bi bi-whatsapp', permission: 'setup.whatsapp_templates', feature_flag: 'is_tally_calling_setup_enabled' },
      { route: 'quotation.setup', title: 'Quotation Setup', icon: 'bi bi-file-earmark-text', permission: 'setup.quotation', feature_flag: 'is_sales_setup_enabled' },
      { route: 'expenses.index', title: 'Expenses', icon: 'bi bi-cash-coin', permission: 'setup.expenses', feature_flag: 'is_petty_cash_setup_enabled' },
      { route: 'petty-opening-balance.index', title: 'Opening Balance', icon: 'bi bi-wallet2', permission: 'setup.petty_opening_balance', feature_flag: 'is_petty_cash_setup_enabled' },
      // Work & Project Setup 
      { route: 'customer', title: 'Customer', icon: 'bi bi-person-badge', permission: 'setup.customers', feature_flag: 'is_work_setup_enabled' },
      { route: 'service', title: 'Project Services', icon: 'bi bi-kanban', permission: 'setup.project_services', feature_flag: 'is_projects_setup_enabled' },
      { route: 'module', title: 'Module', icon: 'bi bi-puzzle', permission: 'setup.project_modules', feature_flag: 'is_projects_setup_enabled' },
      { route: 'customer-project', title: 'Open Project', icon: 'bi bi-collection', permission: 'setup.open_projects', feature_flag: 'is_projects_setup_enabled' },
      { route: 'entry-type.index', title: 'Entry Types', icon: 'bi bi-list-check', permission: 'setup.worklog_entry_types', feature_flag: 'is_work_setup_enabled' },
      { route: 'holiday', title: 'Holidays', icon: 'bi bi-calendar2-event', permission: 'setup.holidays', feature_flag: 'is_attendance_setup_enabled' },
      // Payroll Setup
      { route: 'payroll.settings', title: 'Payroll Settings', icon: 'bi bi-gear', permission: 'setup.payroll_settings', feature_flag: 'is_payroll_setup_enabled' },
      { route: 'payroll.components.index', title: 'Salary Components', icon: 'bi bi-cash-stack', permission: 'setup.payroll_components', feature_flag: 'is_payroll_setup_enabled' },
      { route: 'payroll.structures.index', title: 'Salary Structures', icon: 'bi bi-diagram-3', permission: 'setup.payroll_structures', feature_flag: 'is_payroll_setup_enabled' },
      { route: 'payroll.statutory.index', title: 'Statutory Rules', icon: 'bi bi-shield-check', permission: 'setup.payroll_statutory', feature_flag: 'is_payroll_setup_enabled' },
      { route: 'payroll.final_attendance.view', title: 'Final Attendance', icon: 'bi bi-calendar-check', permission: 'setup.payroll_final_attendance', feature_flag: 'is_payroll_setup_enabled' },
      // Task & Subscription Setup 
      { route: 'task-status.index', title: 'Task Status', icon: 'bi bi-tag', permission: 'setup.task_status', feature_flag: 'is_task_setup_enabled' },
      { route: 'subscription-status.index', title: 'Subscription Status', icon: 'bi bi-tag', permission: 'setup.subscription_status', feature_flag: 'is_subscription_setup_enabled' },
      // Calendar Setup
      { route: 'calendar-events.index', title: 'Calendar Events', icon: 'bi bi-calendar-plus', feature_flag: 'is_calendar_setup_enabled', permission: 'setup.calendar_events' },
      { route: 'calendar-missed-reasons.index', title: 'Missed Reason', icon: 'bi bi-calendar-x', feature_flag: 'is_calendar_setup_enabled', permission: 'setup.calendar_missed_reasons' },
      { route: 'calendar-status.index', title: 'Calendar Status', icon: 'bi bi-tag', feature_flag: 'is_calendar_setup_enabled', permission: 'setup.calendar_status' },
      { route: 'calendar-status-checklist.index', title: 'Status-Checklist', icon: 'bi bi-link-45deg', feature_flag: 'is_calendar_setup_enabled', permission: 'setup.calendar_status_checklist' },
      { route: 'common-events.index', title: 'Common Events', icon: 'bi bi-collection', feature_flag: 'is_calendar_setup_enabled', permission: 'setup.calendar_common_events' },
      { route: 'calendar-social.index', title: 'Calendar Social Handles', icon: 'bi bi-share', feature_flag: 'is_calendar_setup_enabled', permission: 'setup.calendar_social_handles' },
      { route: 'calendar-clients.index', title: 'Calendar Clients', icon: 'bi bi-people', feature_flag: 'is_calendar_setup_enabled', permission: 'setup.calendar_clients' },
      { route: 'calendar-client-social.index', title: 'Client Social Handles', icon: 'bi bi-link-45deg', feature_flag: 'is_calendar_setup_enabled', permission: 'setup.calendar_client_social' },
      { route: 'checklist.index', title: 'Checklist', icon: 'bi bi-list-check', feature_flag: 'is_calendar_setup_enabled', permission: 'setup.checklist' },
      // Asset Management Setup 
      { route: 'asset-type.index', title: 'Asset Types', icon: 'bi bi-box', permission: 'setup.asset_types', feature_flag: 'is_asset_management_setup_enabled' },
      { route: 'asset-category.index', title: 'Asset Categories', icon: 'bi bi-tags', permission: 'setup.asset_categories', feature_flag: 'is_asset_management_setup_enabled' },
      { route: 'asset-status.index', title: 'Asset Status', icon: 'bi bi-check2-circle', permission: 'setup.asset_status', feature_flag: 'is_asset_management_setup_enabled' },
      { route: 'supplier.index', title: 'Suppliers', icon: 'bi bi-truck', permission: 'setup.asset_suppliers', feature_flag: 'is_asset_management_setup_enabled' },
      { route: 'assets.index', title: 'Open Assets', icon: 'bi bi-box-seam', permission: 'setup.open_assets', feature_flag: 'is_asset_management_setup_enabled' },
    ]
  },
];
