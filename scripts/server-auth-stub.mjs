/** Auth stand-in for the verification script: the route's own admin check is
 *  covered elsewhere; these tests target Cloudinary behaviour. */
export async function requireAdmin() { return { uid: 'admin-uid-1', aud: 'test-project' }; }
export async function requireUser() { return { uid: 'admin-uid-1', aud: 'test-project' }; }
