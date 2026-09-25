/**
 * Supabase Storage upload settings.
 *
 * Every upload path in this app names its object with a random suffix
 * (`${Date.now()}-${Math.random()...}.ext`), so a given URL's bytes never
 * change. That makes the content immutable, and it should be cached for as
 * long as the browser will hold it: at `max-age=3600` a student re-downloaded
 * their ~8 MB para PDF at every single class, which was most of the project's
 * egress.
 *
 * The rule that keeps this safe: never overwrite an existing path. Upload
 * under a new random name and update the URL in the database instead.
 */
export const CACHE_FOREVER = "31536000" // one year, the max browsers honour
