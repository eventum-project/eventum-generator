import { describe, expect, it } from 'vitest';

import { HttpUrlSchema, HttpsUrlSchema } from './url';

/**
 * The cases are measured against the backend `HttpUrl`, which is what these
 * schemas mirror: it takes every address below over http or https and refuses
 * the last three.
 */
const LOCAL_ADDRESSES = [
  ['an IP address', 'http://127.0.0.1:9000/'],
  ['localhost', 'http://localhost:8080'],
  ['a container name', 'http://minio:9000'],
  ['an IPv6 literal', 'http://[::1]:8080'],
  ['a private domain', 'http://opensearch-node-1.internal:9200'],
];

describe('HttpUrlSchema', () => {
  it.each(LOCAL_ADDRESSES)('takes an endpoint at %s', (_label, url) => {
    expect(HttpUrlSchema.safeParse(url).success).toBe(true);
  });

  it('takes a public domain over https', () => {
    expect(
      HttpUrlSchema.safeParse('https://s3.eu-west-1.amazonaws.com').success
    ).toBe(true);
  });

  it.each([
    ['a bare word', 'not-a-url'],
    ['another scheme', 'ftp://example.com'],
    ['nothing', ''],
  ])('refuses an endpoint that is %s', (_label, url) => {
    expect(HttpUrlSchema.safeParse(url).success).toBe(false);
  });
});

describe('HttpsUrlSchema', () => {
  it.each(LOCAL_ADDRESSES)(
    'takes an endpoint at %s over https',
    (_label, url) => {
      expect(
        HttpsUrlSchema.safeParse(url.replace('http://', 'https://')).success
      ).toBe(true);
    }
  );

  it('refuses a plaintext endpoint', () => {
    expect(
      HttpsUrlSchema.safeParse('http://login.example.com/token').success
    ).toBe(false);
  });
});
