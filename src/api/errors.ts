import { LandLookupErrorCode } from '../types/land';

/**
 * 브이월드 공통 에러코드 → 사용자 안내 문구 매핑.
 * 사용자가 스스로 해결할 수 없는 설정/키 문제와, 기다리면 되는 한도 초과를 구분해서 안내한다.
 */
const ERROR_TABLE: Record<string, { code: LandLookupErrorCode; message: string }> = {
  // 일일 한도 초과 — 사용자가 내일 다시 시도하면 되는 상황
  OVER_REQUEST_LIMIT: {
    code: 'RATE_LIMIT',
    message: '오늘 조회 한도를 초과했습니다. 내일 다시 시도해주세요.',
  },

  // 인증키/도메인 설정 문제 — 재시도해도 해결되지 않는다
  INVALID_KEY: { code: 'API_KEY', message: '서비스 설정 오류입니다. (등록되지 않은 인증키)' },
  INCORRECT_KEY: { code: 'API_KEY', message: '서비스 설정 오류입니다. (인증키 정보 오류)' },
  UNAVAILABLE_KEY: { code: 'API_KEY', message: '서비스 설정 오류입니다. (임시 사용 불가한 인증키)' },
  URL_TYPE: { code: 'API_KEY', message: '서비스 설정 오류입니다. (등록되지 않은 요청 주소)' },

  // 요청 파라미터 문제 — 앱 버그일 가능성이 높다
  PARAM_REQUIRED: { code: 'PARAM', message: '조회 요청 정보가 올바르지 않습니다. (필수 항목 누락)' },
  INVALID_TYPE: { code: 'PARAM', message: '조회 요청 정보가 올바르지 않습니다. (형식 오류)' },
  INVALID_RANGE: { code: 'PARAM', message: '조회 요청 정보가 올바르지 않습니다. (범위 오류)' },

  // 서버 측 오류 — 잠시 후 재시도 가능
  SYSTEM_ERROR: {
    code: 'SERVER',
    message: '브이월드 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  },
  UNKNOWN_ERROR: {
    code: 'SERVER',
    message: '브이월드 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  },
};

export class VworldApiError extends Error {
  readonly code: LandLookupErrorCode;
  readonly rawCode: string | null;

  constructor(code: LandLookupErrorCode, message: string, rawCode: string | null) {
    super(message);
    this.name = 'VworldApiError';
    this.code = code;
    this.rawCode = rawCode;
  }
}

/** 브이월드 응답의 에러코드/메시지를 사용자 안내용 오류로 변환한다. */
export function toVworldApiError(
  rawCode: string | null | undefined,
  rawMessage?: string | null,
): VworldApiError {
  const key = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  const mapped = ERROR_TABLE[key];

  if (mapped) {
    return new VworldApiError(mapped.code, mapped.message, key || null);
  }

  const detail = rawMessage?.trim() || key || null;
  return new VworldApiError(
    'UNKNOWN',
    detail ? `조회 중 오류가 발생했습니다. (${detail})` : '조회 중 오류가 발생했습니다.',
    key || null,
  );
}

/** 재시도해도 결과가 달라지지 않는 오류인지 (설정 오류, 한도 초과) */
export function isRetryable(code: LandLookupErrorCode): boolean {
  return code !== 'API_KEY' && code !== 'RATE_LIMIT' && code !== 'NO_API_KEY';
}
