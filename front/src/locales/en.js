// English locale - 2026-05-23
export default {
  // Common buttons
  'btn.search': 'Search', 'btn.save': 'Save',     'btn.add': 'Add',
  'btn.cancel': 'Cancel', 'btn.delete': 'Delete',
  'btn.excel': 'Excel',   'btn.upload': 'Upload',  'btn.download': 'Download',
  'msg.noData': 'No data found.', 'msg.saving': 'Saving...', 'msg.wip': 'Coming soon',

  // Menu
  'menu.dashboard': 'Dashboard',
  'menu.workOrder': 'Work Orders',
  'menu.wo.status': 'WO Status',   'menu.wo.create': 'Create WO',
  'menu.wo.assign': 'WO Assign',   'menu.wo.history': 'WO History',
  'menu.production': 'Production',
  'menu.prod.status': 'Prod. Status', 'menu.prod.register': 'Register',
  'menu.prod.report': 'Reports',
  'menu.equipment': 'Equipment',
  'menu.eq.status': 'Equip. Status', 'menu.eq.history': 'Equip. History', 'menu.eq.pm': 'Prev. Maint.',
  'menu.quality': 'Quality',
  'menu.qa.inspect': 'Inspection', 'menu.qa.defect': 'Defects', 'menu.qa.spc': 'SPC Chart',
  'menu.inventory': 'Inventory',
  'menu.inv.status': 'Stock Status', 'menu.inv.inout': 'In/Outbound',
  'menu.process': 'Process',
  'menu.proc.flow': 'Process Flow', 'menu.proc.bom': 'BOM',
  'menu.lot.tracking': 'LOT Tracking',
  'lot.title': 'LOT Tracking',
  'lot.status.CREATED': 'Created', 'lot.status.IN_PROGRESS': 'In Progress',
  'lot.status.COMPLETED': 'Completed', 'lot.status.ON_HOLD': 'On Hold',
  'lot.log.PENDING': 'Pending', 'lot.log.IN_PROGRESS': 'In Progress',
  'lot.log.COMPLETED': 'Completed', 'lot.log.SKIPPED': 'Skipped',
  'menu.masterData': 'Master Data',
  'menu.settings': 'Settings', 'menu.master': 'Master Data', 'menu.userMgmt': 'User Permissions',

  // Work order fields
  'wo.title': 'Work Order Status', 'wo.orderId': 'Order ID',
  'wo.status': 'Status',           'wo.type': 'Type',
  'wo.productCode': 'Item Code',   'wo.productName': 'Item Name',
  'wo.quantity': 'Qty',            'wo.period': 'Plan Period',
  'wo.assignee': 'Assignee',       'wo.dateRange': 'Date Range',
  'wo.priority': 'Priority',       'wo.plannedStart': 'Plan Start',
  'wo.plannedEnd': 'Plan End',     'wo.processCode': 'Process',
  'wo.note': 'Note',               'wo.unit': 'Unit',
  'wo.create.title': 'Create Work Order', 'wo.edit.title': 'Edit Work Order',

  // Work Assignment (dispatch board)
  'wa.title': 'Work Assignment',
  'wa.unassigned': 'Unassigned',
  'wa.process': 'Process',
  'wa.refresh': 'Refresh',
  'wa.count': '',
  'wa.qtySum': 'Total Qty',
  'wa.hintDrag': 'Drag a pending order onto a worker, or tap a card then click a column to assign.',
  'wa.moveHere': 'Assign here',
  'wa.locked': 'In progress (locked)',
  'wa.pendingTotal': 'Unassigned',
  'wa.assignedTotal': 'Assigned',
  'wa.saving': 'Saving assignment…',
  'wa.saved': 'Assignment saved',
  'wa.saveFail': 'Failed — reverting',
  'wa.noWorkers': 'No active workers (register in Master Data).',
  'wa.readOnly': 'View only — no assignment permission.',
  'wa.capacity': 'Capacity',
  'wa.over': 'over',
  'wa.util': 'Load',

  // Options
  'opt.all': 'All',
  'opt.status.PENDING': 'Pending', 'opt.status.IN_PROG': 'In Progress',
  'opt.status.STOPPED': 'Stopped', 'opt.status.DONE': 'Done',
  'opt.type.NORMAL': 'Normal', 'opt.type.URGENT': 'Urgent', 'opt.type.REWORK': 'Rework',
  'opt.priority.HIGH': 'High', 'opt.priority.MEDIUM': 'Medium', 'opt.priority.LOW': 'Low',

  // Master data
  'master.title': 'Master Data',
  'master.tab.process': 'Processes', 'master.tab.employee': 'Employees',
  'master.code': 'Code', 'master.name': 'Name', 'master.active': 'Active',
  'master.create': 'Add Master Data', 'master.edit': 'Edit Master Data',

  // User permissions
  'user.title': 'User Permissions',
  'user.userId': 'User ID',  'user.name': 'Name',
  'user.role': 'Role',       'user.email': 'Email',
  'user.active': 'Active',   'user.menus': 'Menu Access',
  'user.actions': 'Action Permissions',
  'user.create': 'Add User', 'user.edit': 'Edit User',
  'opt.role.ADMIN': 'Admin', 'opt.role.USER': 'User',
  'user.act.add': 'Add', 'user.act.edit': 'Edit', 'user.act.delete': 'Delete',
  'user.act.excel_up': 'Excel Upload', 'user.act.excel_down': 'Excel Download',

  // Production
  'prod.title': 'Production Status',  'prod.prodId': 'Prod. ID',
  'prod.orderId': 'WO Number',        'prod.productCode': 'Item Code',
  'prod.productName': 'Item Name',    'prod.plannedQty': 'Plan Qty',
  'prod.actualQty': 'Actual Qty',     'prod.defectQty': 'Defect Qty',
  'prod.goodQty': 'Good Qty',         'prod.workDate': 'Work Date',
  'prod.startTime': 'Start',          'prod.endTime': 'End',
  'prod.worker': 'Worker',            'prod.processCode': 'Process',
  'prod.note': 'Note',                'prod.status': 'Status',
  'prod.dateRange': 'Date Range',
  'prod.create.title': 'Register Production', 'prod.edit.title': 'Edit Production',
  'opt.prod.ONGOING': 'Ongoing', 'opt.prod.COMPLETED': 'Completed',

  // Inventory
  'inv.title': 'Material Status',   'inv.tab.stock': 'Stock Status',
  'inv.tab.txn': 'In/Out History',  'inv.itemCode': 'Item Code',
  'inv.itemName': 'Item Name',      'inv.itemType': 'Type',
  'inv.currentStock': 'Stock',      'inv.unit': 'Unit',
  'inv.safetyStock': 'Safety Stk',  'inv.stockStatus': 'Status',
  'inv.txnId': 'Txn ID',            'inv.txnType': 'Type',
  'inv.quantity': 'Qty',            'inv.txnDate': 'Date',
  'inv.refId': 'Ref. ID',           'inv.note': 'Note',
  'inv.dateRange': 'Date Range',
  'inv.create.title': 'Register In/Out',
  'opt.txn.IN': 'IN', 'opt.txn.OUT': 'OUT', 'opt.txn.ADJUST': 'Adjust',
  'opt.stock.LOW': 'Low', 'opt.stock.OK': 'OK', 'opt.stock.HIGH': 'High',

  // BOM
  'bom.title': 'BOM Management',
  'bom.productCode': 'Product Code',  'bom.productName': 'Product Name',
  'bom.materialCode': 'Material Code','bom.materialName': 'Material Name',
  'bom.quantity': 'Qty Required',     'bom.unit': 'Unit',
  'bom.note': 'Note',
  'bom.create.title': 'Add BOM',      'bom.edit.title': 'Edit BOM',
  'bom.selectProduct': 'Select a product from the left panel',

  // Quality
  'qa.title': 'Inspection Status',    'qa.inspectId': 'Inspect ID',
  'qa.orderId': 'WO Number',          'qa.productCode': 'Item Code',
  'qa.productName': 'Item Name',      'qa.inspectType': 'Type',
  'qa.quantity': 'Inspect Qty',       'qa.passed': 'Passed',
  'qa.failed': 'Failed',              'qa.passRate': 'Pass Rate',
  'qa.result': 'Result',              'qa.inspector': 'Inspector',
  'qa.inspectDate': 'Inspect Date',   'qa.note': 'Note',
  'qa.dateRange': 'Date Range',
  'qa.create.title': 'Add Inspection','qa.edit.title': 'Edit Inspection',
  'opt.inspect.INCOMING': 'Incoming', 'opt.inspect.IN_PROCESS': 'In-Process', 'opt.inspect.FINAL': 'Final',
  'opt.result.PASS': 'PASS', 'opt.result.CONDITIONAL': 'COND.', 'opt.result.FAIL': 'FAIL',

  // Production Report
  'report.title': 'Production Report', 'report.byDate': 'Daily Production',
  'report.byProduct': 'By Product',    'report.totalPlanned': 'Total Planned',
  'report.totalActual': 'Total Actual','report.achieveRate': 'Achieve Rate',
  'report.defectRate': 'Defect Rate',
  'report.productCode': 'Item Code',   'report.productName': 'Item Name',
  'report.count': 'Records',           'report.planned': 'Planned',
  'report.actual': 'Actual',           'report.defect': 'Defect',
  'report.achieve': 'Achieve',

  // Items
  'menu.item': 'Items',
  'item.title': 'Item Management',
  'item.code': 'Item Code',       'item.name': 'Item Name',
  'item.type': 'Type',            'item.unit': 'Unit',
  'item.spec': 'Spec',            'item.drawingNo': 'Drawing No.',
  'item.unitPrice': 'Unit Price', 'item.minStock': 'Min Stock',
  'item.maxStock': 'Max Stock',   'item.safetyStock': 'Safety Stock',
  'item.note': 'Note',            'item.active': 'Active',
  'item.create': 'Add Item',      'item.edit': 'Edit Item',
  'opt.item.FINISHED': 'Finished', 'opt.item.SEMI': 'Semi-Finished',
  'opt.item.RAW': 'Raw Material',  'opt.item.CONSUMABLE': 'Consumable',

  // Equipment
  'eq.title': 'Equipment Status',
  'eq.code': 'Equip. Code',      'eq.name': 'Equipment Name',
  'eq.type': 'Type',             'eq.status': 'Status',
  'eq.location': 'Location',     'eq.manufacturer': 'Manufacturer',
  'eq.installDate': 'Install Date', 'eq.lastPmDate': 'Last PM Date',
  'eq.active': 'Active',         'eq.note': 'Note',
  'eq.create': 'Add Equipment',  'eq.edit': 'Edit Equipment',
  'eq.dateRange': 'Date Range',
  'opt.eq.type.ALL': 'All',
  'opt.eq.type.PRODUCTION': 'Production', 'opt.eq.type.UTILITY': 'Utility',
  'opt.eq.type.SAFETY': 'Safety',         'opt.eq.type.INSPECTION': 'Inspection',
  'opt.eq.status.ALL': 'All',
  'opt.eq.status.RUNNING': 'Running', 'opt.eq.status.IDLE': 'Idle',
  'opt.eq.status.MAINTENANCE': 'Maintenance', 'opt.eq.status.BREAKDOWN': 'Breakdown',

  // Process Flow
  'flow.title': 'Process Flow',
  'flow.productCode': 'Product Code',  'flow.productName': 'Product Name',
  'flow.processCode': 'Process Code',  'flow.processName': 'Process Name',
  'flow.sequence': 'Sequence',         'flow.cycleTime': 'Cycle Time (min)',
  'flow.note': 'Note',
  'flow.create.title': 'Add Process',  'flow.edit.title': 'Edit Process',
  'flow.selectProduct': 'Select a product from the left panel',

  // Common (added)
  'msg.loading': 'Loading...',
  'msg.loadFail': 'Failed to load data', 'toast.retry': 'Retry',
  'err.title': 'Something went wrong while rendering', 'err.reload': 'Reload',

  // Dashboard - KPI/charts
  'dash.kpiTitle': 'Monthly KPI Status',
  'dash.prodTitle': 'Recent Production (Daily)',
  'dash.invTitle': 'Material Stock',
  'dash.kpi.wo': 'Monthly WO', 'dash.kpi.ongoing': 'Ongoing Prod.', 'dash.kpi.lowStock': 'Low Stock',
  'dash.kpi.passRate': 'Pass Rate', 'dash.kpi.eqRunning': 'Running', 'dash.kpi.eqBreakdown': 'Breakdown',
  'dash.unit.cases': '', 'dash.unit.items': 'items', 'dash.unit.machines': 'units',
  'dash.series.actual': 'Actual', 'dash.series.defect': 'Defect', 'dash.series.stock': 'Stock',
  'dash.noProd': 'No production data this month', 'dash.noInv': 'No stock data',

  // Worker dashboard
  'dw.title': "Today's Work",
  'dw.noWorker': 'No worker code assigned to your account.',
  'dw.noWorkerHint': 'Ask an administrator to register your worker_code.',
  'dw.assignedWo': 'Assigned WO', 'dw.todayProd': "Today's Output", 'dw.todayDefect': "Today's Defects",
  'dw.myWo': 'My Work Orders', 'dw.noWo': 'No assigned work orders.',
  'dw.myProdToday': "Today's Production", 'dw.noProd': 'No production recorded today.',
  'dw.actual': 'Actual', 'dw.defect': 'Defect', 'dw.eqStatus': 'Equipment Status',
  'dw.running': 'Running', 'dw.breakdown': 'Down', 'dw.maint': 'Maint.', 'dw.unitEa': 'EA',

  // AI insight
  'ai.title': 'AI Production Insight',
  'ai.generate': 'Generate', 'ai.regen': 'Regenerate', 'ai.analyzing': 'Analyzing...',
  'ai.highlight': 'Key Highlights', 'ai.caution': 'Attention', 'ai.suggestion': 'Suggestions',
  'ai.autoHint': 'Auto-analyzes after KPI data loads',
  'ai.analyzingLong': "Analyzing this month's KPIs...",
  'ai.tokenUsage': 'Token usage', 'ai.tokenIn': 'In', 'ai.tokenOut': 'Out', 'ai.tokenTotal': 'Total',
  'ai.remaining': '{n} left today', 'ai.generatedSuffix': '',

  // Andon widget
  'andon.title': 'Live Line Status (Andon)',
  'andon.live': 'LIVE', 'andon.connecting': 'Connecting',
  'andon.st.RUNNING': 'Running', 'andon.st.IDLE': 'Idle', 'andon.st.MAINTENANCE': 'Maint.', 'andon.st.BREAKDOWN': 'Down',
  'andon.noEq': 'No equipment registered', 'andon.loadingData': 'Loading live data...',
  'andon.line.PRODUCTION': 'Production', 'andon.line.INSPECTION': 'Inspection',
  'andon.line.UTILITY': 'Utility', 'andon.line.SAFETY': 'Safety', 'andon.line.OTHER': 'Other',
  'andon.view.map': 'Map', 'andon.view.tile': 'Tiles',
  // Command palette - 2026-08-24
  'cmd.placeholder': 'Search pages & actions…', 'cmd.empty': 'No results', 'cmd.jump': 'Quick jump',
  'cmd.selMove': 'Navigate', 'cmd.selOpen': 'Open', 'cmd.selClose': 'Close',
  // Design style (skin) - 2026-08-24
  'skin.title': 'Design style', 'skin.current': 'Current', 'skin.carbon': 'Carbon', 'skin.linear': 'Linear',

  // Notification center
  'noti.tabAlerts': 'Alerts', 'noti.tabNews': 'News',
  'noti.live': 'Live', 'noti.connecting': 'Connecting',
  'noti.noAlerts': 'No alerts.', 'noti.latest': 'Latest',

  // New version toast
  'upd.title': 'A new version is available', 'upd.desc': 'Refresh to apply the latest features.',
  'upd.refresh': 'Refresh', 'upd.later': 'Later',

  // Document output
  'doc.title': 'Document Output',
  'doc.printPlan': 'To print', 'doc.pages': '{n} pages', 'doc.print': 'Print',
  'doc.groupPeriod': 'Period-based', 'doc.noCondition': 'No condition',
  'doc.groupTarget': 'Target required', 'doc.extraCondition': 'Extra condition',
  'doc.selectPrompt': 'Select documents on the left.', 'doc.loading': 'Loading…',
  'doc.targetSelect': 'Select targets', 'doc.targetCount': '{n} selected',
  'doc.pickerSearch': 'Search', 'doc.pickerSelectAll': 'Select all',
  'doc.pickerCount': '{n}', 'doc.pickerNone': 'No targets.',
  'doc.pickerSelected': '{n} selected', 'doc.pickerApply': 'Apply {n}',
  'doc.printConfirm': 'Print {n} pages. Continue?',
  'doc.tpl.prodReport': 'Production Report', 'doc.tpl.qaCert': 'QA Certificate',
  'doc.tpl.woOrder': 'Work Order', 'doc.tpl.eqCheck': 'Equipment Check',
  'doc.pick.woTitle': 'Select Work Order', 'doc.pick.eqTitle': 'Select Equipment',

  // Common UI
  'ui.fav': 'Favorite', 'ui.favOff': 'Remove favorite', 'ui.close': 'Close', 'ui.sort': 'Sort',

  // Panels (split/tabs)
  'panel.pin': 'Pin tab', 'panel.pinOff': 'Unpin',
  'panel.closeAll': 'Close all except pinned', 'panel.split': 'Split view', 'panel.splitClose': 'Close split',

  // Form controls
  'form.selectItem': 'Select item',

  // AI Vision Monitor
  'vm.title': 'AI Vision Monitor',
  'vm.phoneConnected': 'Phone camera connected', 'vm.camWait': 'Camera standby',
  'vm.aiReady': 'AI ready', 'vm.aiError': 'AI error', 'vm.aiLoading': 'AI loading',
  'vm.modelFail': 'AI model load failed (check network)', 'vm.reason': 'Reason',
  'vm.connectReq': 'Phone camera connection request', 'vm.showThis': 'Show this camera feed?',
  'vm.allow': 'Allow', 'vm.block': 'Block', 'vm.blocked': 'Blocked', 'vm.changeAllow': 'Change to allow',
  'vm.waiting': 'Waiting for phone camera...', 'vm.scanHint': 'Scan the QR on the right with your phone to start the camera',
  'vm.modelLoading': 'Loading AI model...',
  'vm.phoneConn': 'Phone Camera Connection', 'vm.qrAlt': 'Camera connection QR',
  'vm.recognized': 'Detected Objects', 'vm.count': '{n}',
  'vm.noObj': 'No objects detected.', 'vm.waitFrame': 'Waiting for video...',
  'vm.footer': 'Recognizes 80 common objects (YOLOv8n). Product/defect-specific detection requires a custom-trained model.',

  // Public phone camera page (/m/cam)
  'pc.title': 'Camera Streaming', 'pc.on': 'Streaming', 'pc.wait': 'Waiting',
  'pc.start': 'Start Camera', 'pc.tapHint': 'Tap to request camera permission',
  'pc.opening': 'Opening camera...', 'pc.retry': 'Retry',
  'pc.noCam': 'Camera is not available here. (HTTPS or localhost required)',
  'pc.denied': 'Camera permission denied. Allow it in browser settings and try again.',
  'pc.startFail': 'Cannot start the camera.',
  'pc.footer1': 'Keep this screen on to stream live video to the PC monitor.',
  'pc.footer2': 'Point the camera at equipment/products to run AI detection on the PC.',

  // Public LOT view page (/m/lot)
  'pl.loading': 'Loading LOT information...',
  'pl.notFound': 'LOT not found', 'pl.notFoundDesc': 'No information for LOT {n}.',
  'pl.brand': 'LOT Tracking', 'pl.mobileView': 'Mobile view',
  'pl.itemCode': 'Item No.', 'pl.itemName': 'Item Name', 'pl.orderId': 'Order ID',
  'pl.qty': 'Qty', 'pl.openedAt': 'Opened', 'pl.closedAt': 'Closed',
  'pl.procHistory': 'Process History', 'pl.noProc': 'No processes registered.',
  'pl.qaTitle': 'Quality Inspection', 'pl.noQa': 'No inspection history.',
  'pl.bomTitle': 'Materials (BOM)', 'pl.noBom': 'No component materials registered.',
  'pl.good': 'Good', 'pl.inspect': 'Inspection', 'pl.passed': 'Passed',
  'pl.pass': 'Pass', 'pl.fail': 'Fail', 'pl.footer': 'QR Scan · Read-only view',

  // QR scanner
  'qr.title': 'QR Scan',
  'qr.noCam': 'Camera is not available in this browser/context. (HTTPS required)',
  'qr.denied': 'Camera permission denied. Please allow it in browser settings.',
  'qr.notFound': 'No available camera found.',
  'qr.startFail': 'Cannot start the camera.',
  'qr.opening': 'Opening camera...',
  'qr.guide': 'Align the LOT QR within the frame to scan automatically.',

  // Widgets (registry labels + edit UI + utilities)
  'widget.portfolio': 'Portfolio', 'widget.kpi': 'Monthly KPI', 'widget.prod': 'Daily Production',
  'widget.inv': 'Material Stock', 'widget.ai': 'AI Insight', 'widget.andon': 'Live Andon',
  'widget.worker': "Today's Work",
  'widget.calc': 'Calculator', 'widget.memo': 'Memo', 'widget.todo': 'To-Do',
  'widget.clock': 'Clock / Date', 'widget.timer': 'Timer',
  'widget.edit': 'Edit widgets', 'widget.editDone': 'Done',
  'widget.addHint': 'click: add · drag: place',
  'widget.move': 'Move', 'widget.hide': 'Hide',
  'widget.emptyEdit': 'No widgets. Add them from "Add widget" on the right sidebar.',
  'widget.emptyMobile': 'No widgets to show.',
  'widget.pause': 'Pause', 'widget.start': 'Start', 'widget.reset': 'Reset',
  'widget.memoPh': 'Type a memo… (auto-saved)',
  'widget.todoPh': 'Add a task…', 'widget.todoEmpty': 'No tasks.',
  'widget.dow': 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',

  // Portfolio widget
  'pf.intro': 'A full-stack MES portfolio project integrating work orders, production, inventory, and quality for automotive parts manufacturing.',
  'pf.features': 'Key Features', 'pf.tech': 'Tech Stack',
  'pf.f.wo.label': 'Work Orders & Production', 'pf.f.wo.desc': 'From orders/assignment to output with backflush stock updates',
  'pf.f.inv.label': 'Inventory', 'pf.f.inv.desc': 'Real-time in/out and stock status',
  'pf.f.qa.label': 'Quality Inspection', 'pf.f.qa.desc': 'Incoming, in-process, and final inspection',
  'pf.f.bom.label': 'BOM & Process Flow', 'pf.f.bom.desc': 'Material requirements and process routing',
  'pf.f.lot.label': 'LOT Tracking (QR)', 'pf.f.lot.desc': 'Process history tracking + QR mobile view',
  'pf.f.andon.label': 'Live Andon & Alerts', 'pf.f.andon.desc': 'Real-time equipment status & alerts via SSE',
  'pf.f.ai.label': 'AI Production Insight', 'pf.f.ai.desc': 'Automated monthly KPI analysis report',
  'pf.f.vision.label': 'AI Vision Monitor', 'pf.f.vision.desc': 'Live phone camera feed + object detection',
}
