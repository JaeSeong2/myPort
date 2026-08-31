// 한국어 로케일 - 2026-05-23
export default {
  // 공통 버튼
  'btn.search': '조회',  'btn.save': '저장',    'btn.add': '등록',
  'btn.cancel': '취소',  'btn.delete': '삭제',
  'btn.excel': '엑셀',   'btn.upload': '업로드', 'btn.download': '다운로드',
  'msg.noData': '데이터가 없습니다.', 'msg.saving': '저장 중...', 'msg.wip': '준비 중',

  // 메뉴
  'menu.dashboard': '대시보드',
  'menu.workOrder': '작업지시 관리',
  'menu.wo.status': '작업지시 현황', 'menu.wo.create': '작업지시 등록',
  'menu.wo.assign': '작업 배정',     'menu.wo.history': '작업 이력',
  'menu.production': '생산 실적',
  'menu.prod.status': '실적 현황', 'menu.prod.register': '실적 등록',
  'menu.prod.report': '일/월 실적 조회',
  'menu.equipment': '설비 관리',
  'menu.eq.status': '설비 현황', 'menu.eq.history': '설비 이력', 'menu.eq.pm': '예방 정비',
  'menu.quality': '품질 관리',
  'menu.qa.inspect': '검사 현황', 'menu.qa.defect': '불량 현황', 'menu.qa.spc': 'SPC 차트',
  'menu.inventory': '재고/자재',
  'menu.inv.status': '자재 현황', 'menu.inv.inout': '입출고 현황',
  'menu.process': '공정 관리',
  'menu.proc.flow': '공정 흐름', 'menu.proc.bom': 'BOM 관리',
  'menu.masterData': '기초정보',
  'menu.settings': '시스템 설정', 'menu.master': '기초정보 관리', 'menu.userMgmt': '사용자 권한관리',

  // 작업지시 필드
  'wo.title': '작업지시 현황',     'wo.orderId': '지시번호',
  'wo.status': '상태',             'wo.type': '유형',
  'wo.productCode': '품목코드',    'wo.productName': '품목명',
  'wo.quantity': '수량',           'wo.period': '계획기간',
  'wo.assignee': '담당자',         'wo.dateRange': '기간',
  'wo.priority': '우선순위',       'wo.plannedStart': '계획시작일',
  'wo.plannedEnd': '계획종료일',   'wo.processCode': '공정코드',
  'wo.note': '비고',               'wo.unit': '단위',
  'wo.create.title': '작업지시 등록', 'wo.edit.title': '작업지시 수정',

  // 선택값
  'opt.all': '전체',
  'opt.status.PENDING': '대기', 'opt.status.IN_PROG': '진행',
  'opt.status.STOPPED': '중지', 'opt.status.DONE': '완료',
  'opt.type.NORMAL': '일반', 'opt.type.URGENT': '긴급', 'opt.type.REWORK': '재작업',
  'opt.priority.HIGH': '높음', 'opt.priority.MEDIUM': '보통', 'opt.priority.LOW': '낮음',

  // 기초정보
  'master.title': '기초정보 관리',
  'master.tab.process': '공정', 'master.tab.employee': '담당자',
  'master.code': '코드', 'master.name': '명칭', 'master.active': '사용여부',
  'master.create': '기초정보 등록', 'master.edit': '기초정보 수정',

  // 사용자 권한관리
  'user.title': '사용자 권한관리',
  'user.userId': '사용자ID', 'user.name': '이름',
  'user.role': '권한',       'user.email': '이메일',
  'user.active': '사용여부', 'user.menus': '메뉴 접근 권한',
  'user.actions': '기능 버튼 권한',
  'user.create': '사용자 등록', 'user.edit': '사용자 수정',
  'opt.role.ADMIN': '관리자', 'opt.role.USER': '일반',
  'user.act.add': '등록', 'user.act.edit': '수정', 'user.act.delete': '삭제',
  'user.act.excel_up': '엑셀 업로드', 'user.act.excel_down': '엑셀 다운로드',

  // 생산실적
  'prod.title': '실적 현황',      'prod.prodId': '실적번호',
  'prod.orderId': '작업지시번호', 'prod.productCode': '품목코드',
  'prod.productName': '품목명',   'prod.plannedQty': '계획수량',
  'prod.actualQty': '실적수량',   'prod.defectQty': '불량수량',
  'prod.goodQty': '양품수량',     'prod.workDate': '작업일자',
  'prod.startTime': '시작시간',   'prod.endTime': '종료시간',
  'prod.worker': '작업자',        'prod.processCode': '공정',
  'prod.note': '비고',            'prod.status': '상태',
  'prod.dateRange': '기간',
  'prod.create.title': '실적 등록', 'prod.edit.title': '실적 수정',
  'opt.prod.ONGOING': '진행중', 'opt.prod.COMPLETED': '완료',

  // 재고/자재
  'inv.title': '자재 현황',       'inv.tab.stock': '재고현황',
  'inv.tab.txn': '입출고 이력',   'inv.itemCode': '품목코드',
  'inv.itemName': '품목명',       'inv.itemType': '유형',
  'inv.currentStock': '현재고',   'inv.unit': '단위',
  'inv.safetyStock': '안전재고',  'inv.stockStatus': '재고상태',
  'inv.txnId': '거래번호',        'inv.txnType': '구분',
  'inv.quantity': '수량',         'inv.txnDate': '일자',
  'inv.refId': '참조번호',        'inv.note': '비고',
  'inv.dateRange': '기간',
  'inv.create.title': '입출고 등록',
  'opt.txn.IN': '입고', 'opt.txn.OUT': '출고', 'opt.txn.ADJUST': '조정',
  'opt.stock.LOW': '부족', 'opt.stock.OK': '적정', 'opt.stock.HIGH': '과잉',

  // BOM 관리
  'bom.title': 'BOM 관리',
  'bom.productCode': '제품코드',  'bom.productName': '제품명',
  'bom.materialCode': '자재코드', 'bom.materialName': '자재명',
  'bom.quantity': '소요량',       'bom.unit': '단위',
  'bom.note': '비고',
  'bom.create.title': 'BOM 등록', 'bom.edit.title': 'BOM 수정',
  'bom.selectProduct': '좌측 목록에서 제품을 선택하세요',

  // 품질검사
  'qa.title': '검사 현황',        'qa.inspectId': '검사번호',
  'qa.orderId': '작업지시번호',   'qa.productCode': '품목코드',
  'qa.productName': '품목명',     'qa.inspectType': '검사유형',
  'qa.quantity': '검사수량',      'qa.passed': '합격수',
  'qa.failed': '불합격수',        'qa.passRate': '합격률',
  'qa.result': '결과',            'qa.inspector': '검사자',
  'qa.inspectDate': '검사일자',   'qa.note': '비고',
  'qa.dateRange': '기간',
  'qa.create.title': '검사 등록', 'qa.edit.title': '검사 수정',
  'opt.inspect.INCOMING': '수입검사', 'opt.inspect.IN_PROCESS': '공정검사', 'opt.inspect.FINAL': '최종검사',
  'opt.result.PASS': '합격', 'opt.result.CONDITIONAL': '조건부합격', 'opt.result.FAIL': '불합격',

  // 생산 실적 보고
  'report.title': '생산 실적 보고',   'report.byDate': '일별 생산 현황',
  'report.byProduct': '제품별 실적',  'report.totalPlanned': '계획 수량',
  'report.totalActual': '실적 수량',  'report.achieveRate': '달성률',
  'report.defectRate': '불량률',
  'report.productCode': '품목코드',   'report.productName': '품목명',
  'report.count': '실적건수',         'report.planned': '계획',
  'report.actual': '실적',            'report.defect': '불량',
  'report.achieve': '달성률',

  // 품목 관리
  'menu.item': '품목 관리',
  'item.title': '품목 관리',
  'item.code': '품목코드',     'item.name': '품목명',
  'item.type': '유형',         'item.unit': '단위',
  'item.spec': '규격',         'item.drawingNo': '도면번호',
  'item.unitPrice': '단가',    'item.minStock': '최소재고',
  'item.maxStock': '최대재고', 'item.safetyStock': '안전재고',
  'item.note': '비고',         'item.active': '사용여부',
  'item.create': '품목 등록',  'item.edit': '품목 수정',
  'opt.item.FINISHED': '완제품', 'opt.item.SEMI': '반제품',
  'opt.item.RAW': '원자재',      'opt.item.CONSUMABLE': '소모품',

  // 설비 관리
  'eq.title': '설비 현황',
  'eq.code': '설비코드',        'eq.name': '설비명',
  'eq.type': '유형',            'eq.status': '상태',
  'eq.location': '위치',        'eq.manufacturer': '제조사',
  'eq.installDate': '설치일자', 'eq.lastPmDate': '최근점검일',
  'eq.active': '사용여부',      'eq.note': '비고',
  'eq.create': '설비 등록',     'eq.edit': '설비 수정',
  'eq.dateRange': '기간',
  'opt.eq.type.ALL': '전체',
  'opt.eq.type.PRODUCTION': '생산', 'opt.eq.type.UTILITY': '유틸리티',
  'opt.eq.type.SAFETY': '안전',     'opt.eq.type.INSPECTION': '검사',
  'opt.eq.status.ALL': '전체',
  'opt.eq.status.RUNNING': '가동',  'opt.eq.status.IDLE': '대기',
  'opt.eq.status.MAINTENANCE': '정비중', 'opt.eq.status.BREAKDOWN': '고장',

  // LOT 추적
  'menu.lot.tracking': 'LOT 추적',
  'lot.title': 'LOT 추적',
  'lot.status.CREATED':     '생성',
  'lot.status.IN_PROGRESS': '진행중',
  'lot.status.COMPLETED':   '완료',
  'lot.status.ON_HOLD':     '보류',
  'lot.log.PENDING':        '대기',
  'lot.log.IN_PROGRESS':    '진행중',
  'lot.log.COMPLETED':      '완료',
  'lot.log.SKIPPED':        '생략',

  // 공정 흐름
  'flow.title': '공정 흐름',
  'flow.productCode': '제품코드',   'flow.productName': '제품명',
  'flow.processCode': '공정코드',   'flow.processName': '공정명',
  'flow.sequence': '순서',          'flow.cycleTime': '사이클타임(분)',
  'flow.note': '비고',
  'flow.create.title': '공정 등록', 'flow.edit.title': '공정 수정',
  'flow.selectProduct': '좌측 목록에서 제품을 선택하세요',

  // 공통(추가)
  'msg.loading': '로딩 중...',
  'msg.loadFail': '데이터를 불러오지 못했습니다', 'toast.retry': '재시도',
  'err.title': '화면 표시 중 문제가 발생했습니다', 'err.reload': '새로고침',

  // 대시보드 - KPI/차트
  'dash.kpiTitle': '월간 KPI 현황',
  'dash.prodTitle': '최근 생산 실적 (일별)',
  'dash.invTitle': '자재 재고 현황',
  'dash.kpi.wo': '월 작업지시', 'dash.kpi.ongoing': '진행중 생산', 'dash.kpi.lowStock': '재고 부족',
  'dash.kpi.passRate': '월 합격률', 'dash.kpi.eqRunning': '가동 설비', 'dash.kpi.eqBreakdown': '고장 설비',
  'dash.unit.cases': '건', 'dash.unit.items': '품목', 'dash.unit.machines': '대',
  'dash.series.actual': '실적수량', 'dash.series.defect': '불량수량', 'dash.series.stock': '현재고',
  'dash.noProd': '이번 달 생산 데이터가 없습니다', 'dash.noInv': '재고 데이터가 없습니다',

  // 작업자 대시보드
  'dw.title': '오늘의 작업 현황',
  'dw.noWorker': '담당 작업자 코드가 설정되지 않았습니다.',
  'dw.noWorkerHint': '관리자에게 worker_code 등록을 요청하세요.',
  'dw.assignedWo': '배정된 작업지시', 'dw.todayProd': '오늘 생산실적', 'dw.todayDefect': '오늘 불량수량',
  'dw.myWo': '내 작업지시', 'dw.noWo': '배정된 작업지시가 없습니다.',
  'dw.myProdToday': '오늘 생산실적', 'dw.noProd': '오늘 입력된 생산실적이 없습니다.',
  'dw.actual': '실적', 'dw.defect': '불량', 'dw.eqStatus': '설비 현황',
  'dw.running': '가동', 'dw.breakdown': '고장', 'dw.maint': '점검', 'dw.unitEa': 'EA',

  // AI 인사이트
  'ai.title': 'AI 생산 인사이트',
  'ai.generate': '인사이트 생성', 'ai.regen': '재생성', 'ai.analyzing': '분석 중...',
  'ai.highlight': '핵심 성과', 'ai.caution': '주의 항목', 'ai.suggestion': '개선 제안',
  'ai.autoHint': 'KPI 데이터 로딩 후 자동으로 분석됩니다',
  'ai.analyzingLong': '이번 달 KPI를 분석하고 있습니다...',
  'ai.tokenUsage': '토큰 사용량', 'ai.tokenIn': '입력', 'ai.tokenOut': '출력', 'ai.tokenTotal': '합계',
  'ai.remaining': '오늘 잔여 {n}회', 'ai.generatedSuffix': '생성',

  // Andon 위젯
  'andon.title': '실시간 라인 현황 (Andon)',
  'andon.live': 'LIVE', 'andon.connecting': '연결 중',
  'andon.st.RUNNING': '가동', 'andon.st.IDLE': '대기', 'andon.st.MAINTENANCE': '정비', 'andon.st.BREAKDOWN': '고장',
  'andon.noEq': '등록된 설비가 없습니다', 'andon.loadingData': '실시간 데이터 로딩 중...',
  'andon.line.PRODUCTION': '생산 라인', 'andon.line.INSPECTION': '검사 라인',
  'andon.line.UTILITY': '유틸리티', 'andon.line.SAFETY': '안전 설비', 'andon.line.OTHER': '기타 설비',
  'andon.view.map': '라인맵', 'andon.view.tile': '타일',
  // 명령 팔레트 - 2026-08-24
  'cmd.placeholder': '페이지·기능 검색…', 'cmd.empty': '검색 결과가 없습니다', 'cmd.jump': '빠른 이동',
  'cmd.selMove': '이동', 'cmd.selOpen': '열기', 'cmd.selClose': '닫기',
  // 디자인 스타일(스킨) - 2026-08-24
  'skin.title': '디자인 스타일', 'skin.current': '현재', 'skin.carbon': 'Carbon 산업형', 'skin.linear': 'Linear 모던',

  // 알림 센터
  'noti.tabAlerts': '알림', 'noti.tabNews': '새소식',
  'noti.live': '실시간', 'noti.connecting': '연결 중',
  'noti.noAlerts': '현재 알림이 없습니다.', 'noti.latest': '최신',

  // 새 버전 토스트
  'upd.title': '새 버전이 있습니다', 'upd.desc': '새로고침하면 최신 기능이 적용됩니다.',
  'upd.refresh': '새로고침', 'upd.later': '나중에',

  // 문서 출력
  'doc.title': '문서 출력',
  'doc.printPlan': '인쇄 예정', 'doc.pages': '{n}장', 'doc.print': '인쇄',
  'doc.groupPeriod': '기간 기준', 'doc.noCondition': '조건 없음',
  'doc.groupTarget': '대상 선택 필요', 'doc.extraCondition': '기간 외 조건',
  'doc.selectPrompt': '좌측에서 문서를 선택하세요.', 'doc.loading': '불러오는 중…',
  'doc.targetSelect': '대상 선택', 'doc.targetCount': '대상 {n}건',
  'doc.pickerSearch': '검색', 'doc.pickerSelectAll': '전체 선택',
  'doc.pickerCount': '{n}건', 'doc.pickerNone': '대상이 없습니다.',
  'doc.pickerSelected': '선택 {n}건', 'doc.pickerApply': '적용 {n}건',
  'doc.printConfirm': '{n}장을 인쇄합니다. 계속할까요?',
  'doc.tpl.prodReport': '생산실적 보고서', 'doc.tpl.qaCert': '품질검사 성적서',
  'doc.tpl.woOrder': '작업지시서', 'doc.tpl.eqCheck': '설비점검표',
  'doc.pick.woTitle': '작업지시 선택', 'doc.pick.eqTitle': '설비 선택',

  // 공통 UI
  'ui.fav': '즐겨찾기', 'ui.favOff': '즐겨찾기 해제', 'ui.close': '닫기', 'ui.sort': '정렬',

  // 패널(분할/탭)
  'panel.pin': '탭 고정', 'panel.pinOff': '고정 해제',
  'panel.closeAll': '고정 제외 모두 닫기', 'panel.split': '화면 분할', 'panel.splitClose': '분할 닫기',

  // 폼 컨트롤
  'form.selectItem': '품목 선택',

  // AI 비전 관제
  'vm.title': 'AI 비전 관제',
  'vm.phoneConnected': '폰 카메라 연결됨', 'vm.camWait': '카메라 대기',
  'vm.aiReady': 'AI 준비됨', 'vm.aiError': 'AI 오류', 'vm.aiLoading': 'AI 로딩중',
  'vm.modelFail': 'AI 모델 로딩 실패 (네트워크 확인)', 'vm.reason': '사유',
  'vm.connectReq': '폰 카메라 연결 요청', 'vm.showThis': '이 카메라 영상을 표시할까요?',
  'vm.allow': '허용', 'vm.block': '차단', 'vm.blocked': '차단됨', 'vm.changeAllow': '허용으로 변경',
  'vm.waiting': '폰 카메라 연결 대기 중...', 'vm.scanHint': '우측 QR을 폰으로 스캔해 카메라를 켜세요',
  'vm.modelLoading': 'AI 모델 로딩 중...',
  'vm.phoneConn': '폰 카메라 연결', 'vm.qrAlt': '카메라 연결 QR',
  'vm.recognized': '인식된 사물', 'vm.count': '{n}개',
  'vm.noObj': '인식된 사물이 없습니다.', 'vm.waitFrame': '영상 수신 대기 중...',
  'vm.footer': '일반 사물 80종 인식(YOLOv8n). 제품·불량 등 현장 특화 인식은 커스텀 학습 모델이 필요합니다.',

  // 공개 폰 카메라 송출 페이지(/m/cam)
  'pc.title': '카메라 송출', 'pc.on': '송출 중', 'pc.wait': '연결 대기',
  'pc.start': '카메라 시작', 'pc.tapHint': '탭하면 카메라 권한을 요청합니다',
  'pc.opening': '카메라 여는 중...', 'pc.retry': '다시 시도',
  'pc.noCam': '이 환경에서는 카메라를 쓸 수 없습니다. (HTTPS 또는 localhost 필요)',
  'pc.denied': '카메라 권한이 거부되었습니다. 브라우저 권한 설정에서 허용 후 다시 시도하세요.',
  'pc.startFail': '카메라를 시작할 수 없습니다.',
  'pc.footer1': '이 화면을 켜두면 PC 관제 화면에 실시간 영상이 전송됩니다.',
  'pc.footer2': '카메라를 설비/제품에 비추면 PC에서 AI 객체 인식이 실행됩니다.',

  // 공개 LOT 조회 페이지(/m/lot)
  'pl.loading': 'LOT 정보를 불러오는 중...',
  'pl.notFound': 'LOT를 찾을 수 없습니다', 'pl.notFoundDesc': '요청하신 {n} 번 LOT 정보가 없습니다.',
  'pl.brand': 'LOT 추적', 'pl.mobileView': '모바일 조회',
  'pl.itemCode': '품번', 'pl.itemName': '품명', 'pl.orderId': '지시번호',
  'pl.qty': '수량', 'pl.openedAt': '개시일', 'pl.closedAt': '완료일',
  'pl.procHistory': '공정 이력', 'pl.noProc': '등록된 공정이 없습니다.',
  'pl.qaTitle': '품질 검사', 'pl.noQa': '검사 이력이 없습니다.',
  'pl.bomTitle': '투입 자재 (BOM)', 'pl.noBom': '등록된 구성 자재가 없습니다.',
  'pl.good': '양품', 'pl.inspect': '검사', 'pl.passed': '합격',
  'pl.pass': '합격', 'pl.fail': '불합격', 'pl.footer': 'QR 스캔 · 읽기 전용 조회 화면',

  // QR 스캐너
  'qr.title': 'QR 스캔',
  'qr.noCam': '이 브라우저/환경에서는 카메라를 사용할 수 없습니다. (HTTPS 필요)',
  'qr.denied': '카메라 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.',
  'qr.notFound': '사용 가능한 카메라를 찾을 수 없습니다.',
  'qr.startFail': '카메라를 시작할 수 없습니다.',
  'qr.opening': '카메라 여는 중...',
  'qr.guide': 'LOT QR을 사각형 안에 맞추면 자동으로 인식됩니다.',

  // 위젯 (레지스트리 라벨 + 편집 UI + 유틸리티)
  'widget.portfolio': '포트폴리오', 'widget.kpi': '월간 KPI 카드', 'widget.prod': '일별 생산 실적',
  'widget.inv': '자재 재고 현황', 'widget.ai': 'AI 생산 인사이트', 'widget.andon': '실시간 Andon',
  'widget.worker': '오늘의 작업 현황',
  'widget.calc': '계산기', 'widget.memo': '메모', 'widget.todo': '할 일 목록',
  'widget.clock': '시계 / 날짜', 'widget.timer': '타이머',
  'widget.edit': '위젯 편집', 'widget.editDone': '편집 완료',
  'widget.addHint': '클릭: 추가 · 드래그: 위치 지정',
  'widget.move': '이동', 'widget.hide': '숨기기',
  'widget.emptyEdit': '표시할 위젯이 없습니다. 오른쪽 사이드바의 “위젯 추가”에서 배치하세요.',
  'widget.emptyMobile': '표시할 위젯이 없습니다.',
  'widget.pause': '일시정지', 'widget.start': '시작', 'widget.reset': '초기화',
  'widget.memoPh': '메모를 입력하세요… (자동 저장)',
  'widget.todoPh': '할 일 추가…', 'widget.todoEmpty': '할 일이 없습니다.',
  'widget.dow': '일,월,화,수,목,금,토',

  // 포트폴리오 위젯
  'pf.intro': '자동차부품 제조 공정의 작업지시부터 생산·재고·품질까지 통합 관리하는 MES 풀스택 포트폴리오 프로젝트입니다.',
  'pf.features': '주요 기능', 'pf.tech': '기술 스택',
  'pf.f.wo.label': '작업지시·생산', 'pf.f.wo.desc': '지시·배정부터 실적·백플러시 자동 재고 반영',
  'pf.f.inv.label': '재고/자재', 'pf.f.inv.desc': '입출고·재고 현황 실시간 조회',
  'pf.f.qa.label': '품질 검사', 'pf.f.qa.desc': '수입·공정·최종 검사 결과 관리',
  'pf.f.bom.label': 'BOM·공정 흐름', 'pf.f.bom.desc': '자재 소요량·공정 순서 정의',
  'pf.f.lot.label': 'LOT 추적 (QR)', 'pf.f.lot.desc': '공정 이력 추적 + QR 모바일 조회',
  'pf.f.andon.label': '실시간 Andon·알림', 'pf.f.andon.desc': 'SSE 기반 설비 현황·이상 알림 실시간',
  'pf.f.ai.label': 'AI 생산 인사이트', 'pf.f.ai.desc': '월간 KPI 자동 분석 리포트',
  'pf.f.vision.label': 'AI 비전 관제', 'pf.f.vision.desc': '폰 카메라 실시간 영상 + 객체 감지',
}
