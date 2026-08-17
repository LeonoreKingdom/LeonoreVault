import type { IncomingHttpHeaders } from 'node:http';
import { Readable, Writable } from 'node:stream';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';

type HeaderValue = string | number | string[] | undefined;

type NodeRequest = Readable &
  Pick<ExpressRequest, 'headers' | 'method' | 'url' | 'originalUrl' | 'protocol'> & {
    httpVersion: string;
    complete: boolean;
    socket: { remoteAddress?: string };
    connection: { remoteAddress?: string };
  };

type NodeResponse = Writable &
  Pick<ExpressResponse, 'statusCode' | 'statusMessage' | 'locals'> & {
    req: NodeRequest;
    setHeader(name: string, value: HeaderValue): NodeResponse;
    getHeader(name: string): HeaderValue;
    removeHeader(name: string): void;
    getHeaderNames(): string[];
    writeHead(statusCode: number, headers?: Record<string, HeaderValue>): NodeResponse;
    flushHeaders(): void;
  };

function toIncomingHeaders(headers: Headers): IncomingHttpHeaders {
  const incomingHeaders: IncomingHttpHeaders = {};
  headers.forEach((value, key) => {
    incomingHeaders[key.toLowerCase()] = value;
  });
  return incomingHeaders;
}

function toHeaderString(value: string | number): string {
  return typeof value === 'number' ? String(value) : value;
}

/**
 * Adapt a Web Request to the existing Express application without opening a
 * listening socket. This keeps the domain modules reusable while Next.js owns
 * the Vercel function entrypoint.
 */
export async function handleExpressRequest(request: Request): Promise<Response> {
  const { default: app } = await import('./index.js');
  const expressApplication = app as unknown as {
    request: object;
    response: object;
    handle(req: NodeRequest, res: NodeResponse): void;
  };
  const requestUrl = new URL(request.url);
  const requestStream = request.body
    ? Readable.fromWeb(request.body as import('node:stream/web').ReadableStream<Uint8Array>)
    : Readable.from([]);
  const nodeRequest = requestStream as NodeRequest;
  const remoteAddress =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1';

  Object.assign(nodeRequest, {
    headers: toIncomingHeaders(request.headers),
    method: request.method,
    url: `${requestUrl.pathname}${requestUrl.search}`,
    originalUrl: `${requestUrl.pathname}${requestUrl.search}`,
    protocol: requestUrl.protocol.replace(':', ''),
    httpVersion: '1.1',
    complete: false,
    socket: { remoteAddress },
    connection: { remoteAddress },
  });
  Object.setPrototypeOf(nodeRequest, expressApplication.request);

  const chunks: Buffer[] = [];
  const responseHeaders = new Map<string, { name: string; value: HeaderValue }>();
  let headersSent = false;
  const responseStream = new Writable({
    write(chunk: string | Buffer | Uint8Array, encoding, callback) {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      else if (typeof chunk === 'string') chunks.push(Buffer.from(chunk, encoding));
      else chunks.push(Buffer.from(chunk));
      callback();
    },
  });
  const nodeResponse = responseStream as NodeResponse;
  const originalWrite = responseStream.write.bind(responseStream);
  const originalEnd = responseStream.end.bind(responseStream);
  const responseFinished = new Promise<void>((resolve) => {
    responseStream.once('finish', resolve);
    responseStream.once('error', resolve);
    responseStream.once('close', resolve);
  });
  Object.setPrototypeOf(nodeResponse, expressApplication.response);
  Object.assign(nodeResponse, {
    req: nodeRequest,
    locals: {},
    statusCode: 200,
    statusMessage: 'OK',
  });

  nodeResponse.setHeader = (name, value) => {
    if (value !== undefined) responseHeaders.set(name.toLowerCase(), { name, value });
    return nodeResponse;
  };
  nodeResponse.getHeader = (name) => responseHeaders.get(name.toLowerCase())?.value;
  nodeResponse.removeHeader = (name) => {
    responseHeaders.delete(name.toLowerCase());
  };
  nodeResponse.getHeaderNames = () => [...responseHeaders.values()].map(({ name }) => name);
  nodeResponse.writeHead = (statusCode, headers = {}) => {
    nodeResponse.statusCode = statusCode;
    for (const [name, value] of Object.entries(headers)) nodeResponse.setHeader(name, value);
    headersSent = true;
    return nodeResponse;
  };
  nodeResponse.flushHeaders = () => {
    headersSent = true;
  };
  Object.defineProperty(nodeResponse, 'headersSent', {
    configurable: true,
    get: () => headersSent,
  });

  nodeResponse.write = ((chunk: unknown, ...args: unknown[]) => {
    headersSent = true;
    return originalWrite(chunk as never, ...(args as never[]));
  }) as NodeResponse['write'];
  nodeResponse.end = ((chunk?: unknown, ...args: unknown[]) => {
    headersSent = true;
    return originalEnd(chunk as never, ...(args as never[]));
  }) as NodeResponse['end'];

  try {
    expressApplication.handle(nodeRequest, nodeResponse);
  } catch (error) {
    nodeResponse.statusCode = 500;
    nodeResponse.setHeader('content-type', 'application/json; charset=utf-8');
    nodeResponse.end(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      }),
    );
  }

  await responseFinished;
  const responseInit = new Headers();
  for (const { name, value } of responseHeaders.values()) {
    if (Array.isArray(value)) {
      for (const item of value) responseInit.append(name, item);
    } else if (value !== undefined) {
      responseInit.set(name, toHeaderString(value));
    }
  }

  return new Response(Buffer.concat(chunks), {
    status: nodeResponse.statusCode,
    statusText: nodeResponse.statusMessage,
    headers: responseInit,
  });
}
