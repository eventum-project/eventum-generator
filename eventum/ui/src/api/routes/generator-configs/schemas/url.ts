import z from 'zod';

/**
 * Address of an endpoint, mirroring the backend `HttpUrl`: any host, over
 * http or https.
 *
 * `z.httpUrl` is not that mirror. It also demands a domain name, so it
 * rejects the address an endpoint on a local network is reached by - an IP
 * address, `localhost`, a container name, an IPv6 literal - all of which the
 * backend accepts. A schema stricter than the server does not merely reject
 * an input: a saved configuration then fails its own response validation,
 * and the project holding it stops opening at all.
 */
export const HttpUrlSchema = z.url({ protocol: /^https?$/ });

/**
 * Address of an endpoint the backend requires to be reached over https,
 * because a credential travels the request to it.
 */
export const HttpsUrlSchema = z.url({
  protocol: /^https$/,
  // the default message reads "Invalid URL", which points at the address
  // rather than at the scheme that is the reason it was refused
  error: 'Must be an https URL',
});
