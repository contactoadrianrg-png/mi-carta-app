export async function requestPasswordReset(auth, email, origin) {
  const { error } = await auth.resetPasswordForEmail(email.trim(), {
    redirectTo: new URL('/reset-password', origin).href,
  })
  if (error) throw error
}
