export function respData(data?: unknown) {
  return respJson(0, 'ok', data);
}

export function respErr(message: string, data?: unknown) {
  return respJson(-1, message, data);
}

export function respJson(code: number, message: string, data?: unknown) {
  return Response.json(
    data === undefined
      ? {
          code,
          message,
        }
      : {
          code,
          message,
          data,
        }
  );
}
